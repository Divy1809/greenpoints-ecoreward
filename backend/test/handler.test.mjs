import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../src/index.mjs';
import { evaluateLabels, publicCatalog } from '../src/catalog.mjs';

const env = { POSTS_TABLE: 'posts', USERS_TABLE: 'users', BUCKET: 'bucket' };
const UUID1 = '11111111-1111-4111-8111-111111111111';
const UUID2 = '22222222-2222-4222-8222-222222222222';

function makeWorld({ labels = [], rekognitionError = null } = {}) {
  const db = { posts: new Map(), users: new Map() };
  const hooks = { beforeUpdate: null };
  const calls = { deleted: [], transactions: [] };
  const ddb = {
    async send(cmd) {
      const name = cmd.constructor.name;
      const input = cmd.input;
      if (name === 'ScanCommand') {
        const table = input.TableName === 'posts' ? db.posts : db.users;
        let items = [...table.values()].map((v) => ({ ...v }));
        if (input.FilterExpression === 'userId = :u') items = items.filter((v) => v.userId === input.ExpressionAttributeValues[':u']);
        return { Items: items };
      }
      if (name === 'UpdateCommand') {
        if (hooks.beforeUpdate) hooks.beforeUpdate();
        const u = db.users.get(input.Key.userId);
        const v = input.ExpressionAttributeValues;
        const cur = u ? Number(u.spentPoints || 0) : null;
        if (!u || cur !== v[':os']) {
          const e = new Error('cond');
          e.name = 'ConditionalCheckFailedException';
          throw e;
        }
        u.spentPoints = v[':ns'];
        u.redemptions = [...(u.redemptions || []), ...v[':e']];
        return {};
      }
      if (name === 'GetCommand') return { Item: db.users.get(input.Key.userId) };
      if (name === 'TransactWriteCommand') {
        calls.transactions.push(input);
        const [put, update] = input.TransactItems;
        if (db.posts.has(put.Put.Item.postId)) {
          const e = new Error('cancelled');
          e.name = 'TransactionCanceledException';
          throw e;
        }
        db.posts.set(put.Put.Item.postId, put.Put.Item);
        const u = db.users.get(update.Update.Key.userId) || { userId: update.Update.Key.userId, totalPoints: 0, postCount: 0 };
        u.displayName = update.Update.ExpressionAttributeValues[':n'];
        u.totalPoints += update.Update.ExpressionAttributeValues[':p'];
        u.postCount += update.Update.ExpressionAttributeValues[':one'];
        db.users.set(u.userId, u);
        return {};
      }
      throw new Error('unexpected ddb command ' + name);
    },
  };
  const s3 = {
    async send(cmd) {
      calls.deleted.push(cmd.input.Key);
      return {};
    },
  };
  const rekognition = {
    async send() {
      if (rekognitionError) {
        const e = new Error('bad');
        e.name = rekognitionError;
        throw e;
      }
      return { Labels: labels };
    },
  };
  const presign = async (cmd, expiresIn) => `https://signed.example/${cmd.input.Key}?exp=${expiresIn}`;
  const handler = createHandler({ ddb, s3, rekognition, presign, env });
  return { handler, db, calls, hooks };
}

const authed = (routeKey, body, sub = 'user-a', name = 'Asha') => ({
  routeKey,
  body: body === undefined ? undefined : JSON.stringify(body),
  requestContext: { authorizer: { jwt: { claims: { sub, name } } } },
});
const anon = (routeKey) => ({ routeKey });
const parse = (res) => JSON.parse(res.body);

test('evaluateLabels respects confidence threshold and activity', () => {
  assert.equal(evaluateLabels('road-cleaning', [{ Name: 'Garbage', Confidence: 95 }]).ok, true);
  assert.equal(evaluateLabels('road-cleaning', [{ Name: 'garbage', Confidence: 95 }]).ok, true, 'case-insensitive');
  assert.equal(evaluateLabels('road-cleaning', [{ Name: 'Garbage', Confidence: 50 }]).ok, false, 'low confidence');
  assert.equal(evaluateLabels('road-cleaning', [{ Name: 'Broom', Confidence: 60 }]).ok, true, 'moderate confidence still passes');
  assert.equal(evaluateLabels('road-cleaning', [{ Name: 'Weapon', Confidence: 99 }, { Name: 'Spear', Confidence: 99 }]).ok, false, 'weapon labels never count');
  assert.equal(evaluateLabels('road-cleaning', [{ Name: 'Person', Confidence: 99 }]).ok, false);
  assert.equal(evaluateLabels('tree-planting', [{ Name: 'Garbage', Confidence: 99 }]).ok, false, 'wrong activity');
  assert.equal(evaluateLabels('flying', [{ Name: 'Tree', Confidence: 99 }]).ok, false);
});

test('public catalog exposes label and points only', () => {
  const c = publicCatalog();
  assert.equal(c['tree-planting'].points, 50);
  assert.equal(c['tree-planting'].labels, undefined);
});

test('unauthenticated users cannot post or upload', async () => {
  const { handler } = makeWorld();
  assert.equal((await handler(anon('POST /posts'))).statusCode, 401);
  assert.equal((await handler(anon('POST /upload-url'))).statusCode, 401);
  assert.equal((await handler(anon('GET /me'))).statusCode, 401);
});

test('unknown route returns 404', async () => {
  const { handler } = makeWorld();
  assert.equal((await handler(anon('GET /nope'))).statusCode, 404);
});

test('upload-url only allows JPEG/PNG and scopes the key to the user', async () => {
  const { handler } = makeWorld();
  assert.equal((await handler(authed('POST /upload-url', { contentType: 'image/gif' }))).statusCode, 400);
  const ok = await handler(authed('POST /upload-url', { contentType: 'image/png' }, 'user-a'));
  assert.equal(ok.statusCode, 200);
  const body = parse(ok);
  assert.match(body.key, /^uploads\/user-a\/[0-9a-f-]{36}\.png$/);
  assert.ok(body.uploadUrl.startsWith('https://signed.example/'));
});

test('post is rejected for another user\'s key, bad type, malformed json', async () => {
  const { handler, db } = makeWorld({ labels: [{ Name: 'Garbage', Confidence: 99 }] });
  const other = await handler(authed('POST /posts', { type: 'road-cleaning', key: `uploads/user-b/${UUID1}.jpg` }));
  assert.equal(other.statusCode, 400);
  const badType = await handler(authed('POST /posts', { type: 'flying', key: `uploads/user-a/${UUID1}.jpg` }));
  assert.equal(badType.statusCode, 400);
  const badJson = await handler({ ...authed('POST /posts'), body: '{nope' });
  assert.equal(badJson.statusCode, 400);
  assert.equal(db.posts.size, 0);
});

test('photo that fails Rekognition check gets no points, is deleted, and shows seen labels', async () => {
  const { handler, db, calls } = makeWorld({ labels: [{ Name: 'Person', Confidence: 99 }, { Name: 'Selfie', Confidence: 90 }] });
  const key = `uploads/user-a/${UUID1}.jpg`;
  const res = await handler(authed('POST /posts', { type: 'tree-planting', key }));
  assert.equal(res.statusCode, 422);
  assert.deepEqual(parse(res).seenLabels, ['Person 99%', 'Selfie 90%']);
  assert.equal(db.posts.size, 0);
  assert.equal(db.users.size, 0);
  assert.deepEqual(calls.deleted, [key]);
});

test('Rekognition failure returns a clean 400', async () => {
  const { handler } = makeWorld({ rekognitionError: 'InvalidImageFormatException' });
  const res = await handler(authed('POST /posts', { type: 'tree-planting', key: `uploads/user-a/${UUID1}.jpg` }));
  assert.equal(res.statusCode, 400);
});

test('verified photo gives server-controlled points even if client sends its own', async () => {
  const { handler, db } = makeWorld({ labels: [{ Name: 'Plant', Confidence: 97 }] });
  const res = await handler(
    authed('POST /posts', { type: 'tree-planting', key: `uploads/user-a/${UUID1}.jpg`, caption: '  Neem sapling  ', points: 9999 }),
  );
  assert.equal(res.statusCode, 201);
  const body = parse(res);
  assert.equal(body.pointsEarned, 50);
  assert.equal(body.totalPoints, 50);
  assert.equal(body.post.caption, 'Neem sapling');
  assert.equal(db.users.get('user-a').totalPoints, 50);
  assert.equal(db.users.get('user-a').postCount, 1);
});

test('the same uploaded photo cannot be posted twice', async () => {
  const { handler, db } = makeWorld({ labels: [{ Name: 'Plant', Confidence: 97 }] });
  const req = authed('POST /posts', { type: 'tree-planting', key: `uploads/user-a/${UUID1}.jpg` });
  assert.equal((await handler(req)).statusCode, 201);
  assert.equal((await handler(req)).statusCode, 409);
  assert.equal(db.users.get('user-a').totalPoints, 50);
});

test('feed is newest first with signed image links; leaderboard and /me are ranked', async () => {
  const { handler, db } = makeWorld({ labels: [{ Name: 'Garbage', Confidence: 95 }, { Name: 'Plant', Confidence: 95 }] });
  await handler(authed('POST /posts', { type: 'road-cleaning', key: `uploads/user-a/${UUID1}.jpg` }, 'user-a', 'Asha'));
  await new Promise((r) => setTimeout(r, 5));
  await handler(authed('POST /posts', { type: 'tree-planting', key: `uploads/user-b/${UUID2}.jpg` }, 'user-b', 'Ravi'));

  const feed = parse(await handler(anon('GET /feed')));
  assert.equal(feed.posts.length, 2);
  assert.equal(feed.posts[0].displayName, 'Ravi');
  assert.match(feed.posts[0].imageUrl, /^https:\/\/signed\.example\/uploads\/user-b\//);

  const lb = parse(await handler(anon('GET /leaderboard')));
  assert.deepEqual(lb.leaderboard.map((e) => [e.rank, e.displayName, e.points]), [[1, 'Ravi', 50], [2, 'Asha', 30]]);
  assert.deepEqual(lb.community, { members: 2, posts: 2, points: 80 });

  const me = parse(await handler(authed('GET /me', undefined, 'user-a', 'Asha')));
  assert.equal(me.rank, 2);
  assert.equal(me.points, 30);

  const newbie = parse(await handler(authed('GET /me', undefined, 'user-z', 'Zed')));
  assert.equal(newbie.rank, null);
  assert.equal(newbie.points, 0);
  assert.equal(db.users.size, 2);
});

test('rewards list is public and my-posts needs login', async () => {
  const { handler } = makeWorld();
  const r = parse(await handler(anon('GET /rewards')));
  assert.equal(r.rewards.length, 5);
  assert.equal(r.rewards[0].cost, 50);
  assert.equal((await handler(anon('GET /my-posts'))).statusCode, 401);
  assert.equal((await handler(anon('POST /rewards/redeem'))).statusCode, 401);
});

test('my-posts returns only the caller\'s posts, newest first', async () => {
  const { handler } = makeWorld({ labels: [{ Name: 'Plant', Confidence: 95 }, { Name: 'Garbage', Confidence: 95 }] });
  await handler(authed('POST /posts', { type: 'tree-planting', key: `uploads/user-a/${UUID1}.jpg` }, 'user-a', 'Asha'));
  await handler(authed('POST /posts', { type: 'tree-planting', key: `uploads/user-b/${UUID2}.jpg` }, 'user-b', 'Ravi'));
  const mine = parse(await handler(authed('GET /my-posts', undefined, 'user-a', 'Asha')));
  assert.equal(mine.posts.length, 1);
  assert.equal(mine.posts[0].userId, 'user-a');
  assert.match(mine.posts[0].imageUrl, /^https:\/\/signed\.example\/uploads\/user-a\//);
});

async function withPoints(points) {
  const w = makeWorld();
  w.db.users.set('user-a', { userId: 'user-a', displayName: 'Asha', totalPoints: points, postCount: 1 });
  return w;
}

test('redeem: not enough points is refused and nothing is spent', async () => {
  const { handler, db } = await withPoints(40);
  const res = await handler(authed('POST /rewards/redeem', { rewardId: 'certificate' }));
  assert.equal(res.statusCode, 400);
  assert.equal(db.users.get('user-a').spentPoints, undefined);
  assert.equal((await handler(authed('POST /rewards/redeem', { rewardId: 'nope' }))).statusCode, 400);
});

test('redeem: success spends points, returns a code, and /me shows balance', async () => {
  const { handler, db } = await withPoints(130);
  const res = await handler(authed('POST /rewards/redeem', { rewardId: 'sapling' }));
  assert.equal(res.statusCode, 200);
  const body = parse(res);
  assert.match(body.redemption.code, /^GP-[0-9A-F]{4}-[0-9A-F]{4}$/);
  assert.equal(body.balance, 10);
  assert.equal(db.users.get('user-a').totalPoints, 130, 'lifetime points untouched');
  const me = parse(await handler(authed('GET /me')));
  assert.equal(me.points, 130);
  assert.equal(me.spent, 120);
  assert.equal(me.balance, 10);
  assert.equal(me.redemptions.length, 1);
});

test('redeem: balance exactly equal to cost works, then a second try fails', async () => {
  const { handler } = await withPoints(50);
  assert.equal((await handler(authed('POST /rewards/redeem', { rewardId: 'certificate' }))).statusCode, 200);
  assert.equal((await handler(authed('POST /rewards/redeem', { rewardId: 'certificate' }))).statusCode, 400);
});

test('redeem: a concurrent spend gives 409 instead of double-spending', async () => {
  const { handler, db, hooks } = await withPoints(300);
  hooks.beforeUpdate = () => { db.users.get('user-a').spentPoints = 120; };
  const res = await handler(authed('POST /rewards/redeem', { rewardId: 'cloth-bag' }));
  assert.equal(res.statusCode, 409);
  assert.equal(db.users.get('user-a').spentPoints, 120);
});
