import { randomUUID, randomBytes } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { ACTIVITY_TYPES, publicCatalog, evaluateLabels, REWARDS, publicRewards } from './catalog.mjs';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png' }; // Rekognition accepts only JPEG and PNG
const KEY_RE = /^uploads\/([^/]+)\/([0-9a-f-]{36})\.(jpg|png)$/;

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function createHandler({ ddb, s3, rekognition, presign, env }) {
  async function scanAll(TableName, filter) {
    const items = [];
    let ExclusiveStartKey;
    for (let page = 0; page < 10; page += 1) {
      const res = await ddb.send(new ScanCommand({ TableName, ExclusiveStartKey, ...(filter || {}) }));
      items.push(...(res.Items || []));
      ExclusiveStartKey = res.LastEvaluatedKey;
      if (!ExclusiveStartKey) break;
    }
    return items;
  }

  async function rankedUsers() {
    const users = await scanAll(env.USERS_TABLE);
    return users
      .map((u) => ({
        userId: u.userId,
        displayName: u.displayName || 'Eco user',
        points: Number(u.totalPoints || 0),
        posts: Number(u.postCount || 0),
      }))
      .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));
  }

  async function shapePosts(items) {
    return Promise.all(
      items.map(async (p) => ({
        postId: p.postId,
        userId: p.userId,
        displayName: p.displayName,
        type: p.type,
        activity: ACTIVITY_TYPES[p.type]?.label || p.type,
        points: p.points,
        caption: p.caption,
        createdAt: p.createdAt,
        imageUrl: await presign(new GetObjectCommand({ Bucket: env.BUCKET, Key: p.imageKey }), 3600),
      })),
    );
  }

  const newestFirst = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));

  async function getFeed() {
    const items = await scanAll(env.POSTS_TABLE);
    items.sort(newestFirst);
    return { posts: await shapePosts(items.slice(0, 40)) };
  }

  async function getMyPosts(userId) {
    const items = await scanAll(env.POSTS_TABLE, {
      FilterExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    });
    items.sort(newestFirst);
    return { posts: await shapePosts(items.slice(0, 200)) };
  }

  async function getLeaderboard() {
    const users = await rankedUsers();
    return {
      leaderboard: users.slice(0, 10).map((u, i) => ({ rank: i + 1, userId: u.userId, displayName: u.displayName, points: u.points, posts: u.posts })),
      community: {
        members: users.length,
        posts: users.reduce((s, u) => s + u.posts, 0),
        points: users.reduce((s, u) => s + u.points, 0),
      },
    };
  }

  async function getMe(userId, displayName) {
    const users = await rankedUsers();
    const index = users.findIndex((u) => u.userId === userId);
    const me = index >= 0 ? users[index] : null;
    const rec = await ddb.send(new GetCommand({ TableName: env.USERS_TABLE, Key: { userId }, ConsistentRead: true }));
    const spent = Number(rec.Item?.spentPoints || 0);
    const points = me?.points || 0;
    return {
      userId,
      displayName: me?.displayName || displayName,
      points,
      posts: me?.posts || 0,
      rank: index >= 0 ? index + 1 : null,
      spent,
      balance: points - spent,
      redemptions: rec.Item?.redemptions || [],
    };
  }

  async function redeem(userId, body) {
    const reward = REWARDS[String(body.rewardId || '')];
    if (!reward) throw new HttpError(400, 'Unknown reward.');
    const rec = await ddb.send(new GetCommand({ TableName: env.USERS_TABLE, Key: { userId }, ConsistentRead: true }));
    const total = Number(rec.Item?.totalPoints || 0);
    const spent = Number(rec.Item?.spentPoints || 0);
    if (total - spent < reward.cost) {
      throw new HttpError(400, `You need ${reward.cost} points for this reward. Your balance is ${total - spent}.`);
    }
    const code = `GP-${randomBytes(2).toString('hex').toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const entry = { rewardId: String(body.rewardId), title: reward.title, cost: reward.cost, code, at: new Date().toISOString() };
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: env.USERS_TABLE,
          Key: { userId },
          UpdateExpression: 'SET spentPoints = :ns, redemptions = list_append(if_not_exists(redemptions, :empty), :e)',
          ConditionExpression: 'attribute_exists(userId) AND (attribute_not_exists(spentPoints) OR spentPoints = :os)',
          ExpressionAttributeValues: { ':ns': spent + reward.cost, ':os': spent, ':empty': [], ':e': [entry] },
        }),
      );
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') throw new HttpError(409, 'Your balance changed. Please try again.');
      throw err;
    }
    return { redemption: entry, balance: total - spent - reward.cost };
  }

  async function createUploadUrl(userId, body) {
    const ext = EXT[body.contentType];
    if (!ext) throw new HttpError(400, 'Only JPEG or PNG photos are supported.');
    const key = `uploads/${userId}/${randomUUID()}.${ext}`;
    const uploadUrl = await presign(new PutObjectCommand({ Bucket: env.BUCKET, Key: key, ContentType: body.contentType }), 300);
    return { uploadUrl, key };
  }

  async function createPost(userId, displayName, body) {
    const type = String(body.type || '');
    const activity = ACTIVITY_TYPES[type];
    if (!activity) throw new HttpError(400, 'Unknown activity type.');
    const m = KEY_RE.exec(String(body.key || ''));
    if (!m || m[1] !== userId) throw new HttpError(400, 'Invalid photo reference.');
    const postId = m[2]; // one upload can only ever become one post
    const caption = String(body.caption || '').trim().slice(0, 140);

    let labels;
    try {
      const res = await rekognition.send(
        new DetectLabelsCommand({
          Image: { S3Object: { Bucket: env.BUCKET, Name: body.key } },
          MaxLabels: 40,
          MinConfidence: 40, // fetch weaker labels too so we can show what was seen; matching uses MIN_CONFIDENCE
        }),
      );
      labels = res.Labels || [];
    } catch (err) {
      throw new HttpError(400, 'Could not analyse the photo. Please upload a clear JPEG or PNG.', { detail: err.name });
    }

    const verdict = evaluateLabels(type, labels);
    if (!verdict.ok) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: env.BUCKET, Key: body.key }));
      } catch {
        /* best effort */
      }
      throw new HttpError(422, `This photo doesn't look like "${activity.label}", so no points were given.`, {
        seenLabels: labels.slice(0, 15).map((l) => `${l.Name} ${Math.round(l.Confidence)}%`),
      });
    }

    const post = {
      postId,
      userId,
      displayName,
      type,
      caption,
      imageKey: body.key,
      points: activity.points,
      labels: verdict.matched,
      createdAt: new Date().toISOString(),
    };
    try {
      await ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            { Put: { TableName: env.POSTS_TABLE, Item: post, ConditionExpression: 'attribute_not_exists(postId)' } },
            {
              Update: {
                TableName: env.USERS_TABLE,
                Key: { userId },
                UpdateExpression: 'SET displayName = :n ADD totalPoints :p, postCount :one',
                ExpressionAttributeValues: { ':n': displayName, ':p': activity.points, ':one': 1 },
              },
            },
          ],
        }),
      );
    } catch (err) {
      if (err.name === 'TransactionCanceledException') throw new HttpError(409, 'This photo was already posted.');
      throw err;
    }
    const user = await ddb.send(new GetCommand({ TableName: env.USERS_TABLE, Key: { userId }, ConsistentRead: true }));
    return {
      post: { ...post, activity: activity.label },
      pointsEarned: activity.points,
      totalPoints: Number(user.Item?.totalPoints || activity.points),
    };
  }

  return async function handler(event) {
    try {
      const route = event.routeKey;
      const claims = event.requestContext?.authorizer?.jwt?.claims || {};
      const userId = claims.sub;
      const displayName = String(claims.name || (claims.email ? String(claims.email).split('@')[0] : '') || 'Eco user');

      let body = {};
      if (event.body) {
        const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
        try {
          body = JSON.parse(raw);
        } catch {
          throw new HttpError(400, 'Request body must be valid JSON.');
        }
      }

      switch (route) {
        case 'GET /activity-types':
          return json(200, publicCatalog());
        case 'GET /feed':
          return json(200, await getFeed());
        case 'GET /leaderboard':
          return json(200, await getLeaderboard());
        case 'GET /rewards':
          return json(200, { rewards: publicRewards() });
        case 'GET /me':
        case 'GET /my-posts':
        case 'POST /rewards/redeem':
        case 'POST /upload-url':
        case 'POST /posts': {
          if (!userId) throw new HttpError(401, 'Please log in.');
          if (route === 'GET /me') return json(200, await getMe(userId, displayName));
          if (route === 'GET /my-posts') return json(200, await getMyPosts(userId));
          if (route === 'POST /rewards/redeem') return json(200, await redeem(userId, body));
          if (route === 'POST /upload-url') return json(200, await createUploadUrl(userId, body));
          return json(201, await createPost(userId, displayName, body));
        }
        default:
          throw new HttpError(404, 'Route not found.');
      }
    } catch (err) {
      if (err instanceof HttpError) return json(err.status, { error: err.message, ...err.extra });
      console.error('Unhandled error', err);
      return json(500, { error: 'Something went wrong on the server.' });
    }
  };
}

let realHandler;
export const handler = (event) => {
  if (!realHandler) {
    // WHEN_REQUIRED stops the SDK adding a CRC32 checksum to presigned PUT URLs,
    // which would make direct browser uploads fail.
    const s3 = new S3Client({ requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
    realHandler = createHandler({
      ddb: DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } }),
      s3,
      rekognition: new RekognitionClient({}),
      presign: (command, expiresIn) => getSignedUrl(s3, command, { expiresIn }),
      env: { POSTS_TABLE: process.env.POSTS_TABLE, USERS_TABLE: process.env.USERS_TABLE, BUCKET: process.env.BUCKET },
    });
  }
  return realHandler(event);
};
