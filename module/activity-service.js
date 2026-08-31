/**
 * Processing layer for Add Eco Activity.
 *
 * AWS deployment note: replace LocalDynamoDBRepository with a repository that
 * calls DynamoDB PutItem/UpdateItem. The request and response contract stays
 * the same, so this service can run inside an AWS Lambda handler.
 */
const crypto = require('node:crypto');

// The server is the source of truth: clients never choose point values.
const ACTIVITY_CATALOG = {
  recycling: { label: 'Recycling', points: 25, description: 'Recycle household material responsibly.' },
  'tree-planting': { label: 'Tree Planting', points: 100, description: 'Plant and care for a tree.' },
  'public-transport': { label: 'Public Transport', points: 20, description: 'Choose a shared public transport trip.' },
  'reusable-bag': { label: 'Reusable Bag', points: 10, description: 'Use a reusable shopping bag.' },
};
const POINT_LIMITS = Object.fromEntries(Object.entries(ACTIVITY_CATALOG).map(([type, item]) => [type, item.points]));

function validateActivity(input) {
  if (!input || typeof input !== 'object') throw new Error('A JSON activity is required.');
  const userId = String(input.userId || '').trim();
  const type = String(input.type || '').trim();
  if (!userId) throw new Error('An authenticated user is required.');
  if (!Object.hasOwn(ACTIVITY_CATALOG, type)) {
    throw new Error(`type must be one of: ${Object.keys(ACTIVITY_CATALOG).join(', ')}.`);
  }
  if (input.points !== undefined && Number(input.points) !== ACTIVITY_CATALOG[type].points) {
    throw new Error('Points are controlled by the GreenPoints activity catalog and cannot be changed.');
  }
  const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();
  if (Number.isNaN(timestamp.valueOf())) throw new Error('timestamp must be an ISO-8601 date.');
  return { userId, type, points: ACTIVITY_CATALOG[type].points, timestamp: timestamp.toISOString() };
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

module.exports = { ACTIVITY_CATALOG, POINT_LIMITS, validateActivity, addEcoActivity };
