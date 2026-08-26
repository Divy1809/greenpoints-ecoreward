const test = require('node:test');
const assert = require('node:assert/strict');
const { addEcoActivity, validateActivity } = require('../activity-service');

test('validates activity type and point limit', () => {
  assert.throws(() => validateActivity({ userId: 'u1', type: 'flying', points: 1, timestamp: '2026-01-01T00:00:00Z' }));
  assert.throws(() => validateActivity({ userId: 'u1', type: 'recycling', points: 26, timestamp: '2026-01-01T00:00:00Z' }));
});

test('records activity and returns updated point total', async () => {
  const activities = [];
  const repository = { async storeActivityAndIncrementPoints(activity) { activities.push(activity); return 20; } };
  const result = await addEcoActivity({ userId: 'u1', type: 'recycling', points: 20, timestamp: '2026-01-01T00:00:00Z' }, repository);
  assert.equal(result.updatedPointTotal, 20);
  assert.equal(activities.length, 1);
  assert.equal(activities[0].type, 'recycling');
});
