/**
 * Processing layer for Add Eco Activity.
 *
 * AWS deployment note: replace LocalDynamoDBRepository with a repository that
 * calls DynamoDB PutItem/UpdateItem. The request and response contract stays
 * the same, so this service can run inside an AWS Lambda handler.
 */
const crypto = require('node:crypto');

const POINT_LIMITS = {
  recycling: 25,
  'tree-planting': 100,
  'public-transport': 20,
  'reusable-bag': 10,
};

function validateActivity(input) {
  if (!input || typeof input !== 'object') throw new Error('A JSON activity is required.');
  const userId = String(input.userId || '').trim();
  const type = String(input.type || '').trim();
  const points = Number(input.points);
  const timestamp = new Date(input.timestamp);
  if (!userId) throw new Error('userId is required.');
  if (!Object.hasOwn(POINT_LIMITS, type)) {
    throw new Error(`type must be one of: ${Object.keys(POINT_LIMITS).join(', ')}.`);
  }
  if (!Number.isInteger(points) || points < 1 || points > POINT_LIMITS[type]) {
    throw new Error(`points must be a whole number from 1 to ${POINT_LIMITS[type]} for ${type}.`);
  }
  if (Number.isNaN(timestamp.valueOf())) throw new Error('timestamp must be an ISO-8601 date.');
  return { userId, type, points, timestamp: timestamp.toISOString() };
}

async function addEcoActivity(input, repository) {
  const activity = {
    ...validateActivity(input),
    activityId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const updatedPointTotal = await repository.storeActivityAndIncrementPoints(activity);
  return {
    message: 'Eco activity recorded successfully.',
    activity,
    updatedPointTotal,
  };
}

module.exports = { POINT_LIMITS, validateActivity, addEcoActivity };
