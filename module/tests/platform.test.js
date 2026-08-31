const test = require('node:test');
const assert = require('node:assert/strict');
const { addEcoActivity, validateActivity } = require('../activity-service');
const { badgeStatus, monthlyReport, dashboardForUser } = require('../dashboard-service');

class MemoryRepository {
  constructor() { this.activities = []; this.points = {}; this.users = {}; }
  async createUser(user) { if (this.users[user.userId]) throw new Error('exists'); this.users[user.userId] = user; return user; }
  async getUser(userId) { return this.users[userId] || null; }
  async storeActivityAndIncrementPoints(activity) { this.activities.push(activity); this.points[activity.userId] = (this.points[activity.userId] || 0) + activity.points; return this.points[activity.userId]; }
  async activitiesForUser(userId) { return this.activities.filter((a) => a.userId === userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); }
  async leaderboard() { return Object.entries(this.points).map(([userId, points]) => ({ userId, displayName: this.users[userId]?.displayName || userId, points })).sort((a, b) => b.points - a.points); }
}

test('accepts a catalog activity and assigns its server-controlled points', async () => {
  const repository = new MemoryRepository();
  const result = await addEcoActivity({ userId: 'maya', type: 'recycling', timestamp: '2026-08-01T10:00:00Z' }, repository);
  assert.equal(result.activity.points, 25);
  assert.equal(result.updatedPointTotal, 25);
});

test('rejects an invalid activity and manipulated point value', () => {
  assert.throws(() => validateActivity({ userId: 'maya', type: 'flying' }));
  assert.throws(() => validateActivity({ userId: 'maya', type: 'recycling', points: 999 }), /cannot be changed/);
});

test('calculates activity history, totals and ranked leaderboard from stored entries', async () => {
  const repository = new MemoryRepository();
  repository.users.maya = { userId: 'maya', displayName: 'Maya' }; repository.users.lee = { userId: 'lee', displayName: 'Lee' };
  await addEcoActivity({ userId: 'maya', type: 'tree-planting', timestamp: '2026-08-03T10:00:00Z' }, repository);
  await addEcoActivity({ userId: 'maya', type: 'recycling', timestamp: '2026-08-02T10:00:00Z' }, repository);
  await addEcoActivity({ userId: 'lee', type: 'public-transport', timestamp: '2026-08-04T10:00:00Z' }, repository);
  const dashboard = await dashboardForUser(repository.users.maya, repository);
  assert.equal(dashboard.totalPoints, 125); assert.equal(dashboard.activityCount, 2); assert.equal(dashboard.rank, 1);
  assert.equal(dashboard.recentActivities[0].type, 'tree-planting'); assert.equal(dashboard.leaderboard[0].userId, 'maya');
});

test('awards milestone badges and reports monthly activity data', () => {
  const activities = [
    { type: 'recycling', points: 25, timestamp: '2026-07-20T10:00:00Z' },
    { type: 'tree-planting', points: 100, timestamp: '2026-08-02T10:00:00Z' },
    { type: 'public-transport', points: 20, timestamp: '2026-08-12T10:00:00Z' },
  ];
  const badges = badgeStatus(activities); assert.equal(badges.find((badge) => badge.id === 'first-green-step').earned, true); assert.equal(badges.find((badge) => badge.id === 'eco-starter').earned, true);
  const report = monthlyReport(activities, '2026-08'); assert.equal(report.totalActivities, 2); assert.equal(report.totalPoints, 120); assert.equal(report.previousPeriod.totalPoints, 25); assert.equal(report.badgesEarned.some((badge) => badge.id === 'eco-starter'), true);
});
