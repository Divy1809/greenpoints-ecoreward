/**
 * Local DynamoDB-compatible repository used for the classroom demo.
 * It persists two DynamoDB-style collections (Activities and UserPoints) in a
 * JSON file. For AWS, implement the same methods with DynamoDB TransactWriteItems.
 */
const fs = require('node:fs/promises');
const path = require('node:path');

class LocalDynamoDBRepository {
  constructor(filePath = path.join(__dirname, 'data', 'greenpoints-local-dynamodb.json')) {
    this.filePath = filePath;
  }

  async read() {
    try {
      const data = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
      return { Activities: [], UserPoints: {}, Users: {}, ...data };
    } catch (error) {
      if (error.code === 'ENOENT') return { Activities: [], UserPoints: {}, Users: {} };
      throw error;
    }
  }

  async write(data) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async createUser(user) {
    const data = await this.read();
    if (data.Users[user.userId]) throw new Error('That user ID is already registered.');
    data.Users[user.userId] = user;
    await this.write(data);
    return user;
  }

  async getUser(userId) { return (await this.read()).Users[userId] || null; }

  async storeActivityAndIncrementPoints(activity) {
    const data = await this.read();
    data.Activities.push(activity);
    data.UserPoints[activity.userId] = (data.UserPoints[activity.userId] || 0) + activity.points;
    data.Users[activity.userId] ||= { userId: activity.userId, displayName: activity.userId, createdAt: activity.createdAt, legacyDemoUser: true };
    await this.write(data);
    return data.UserPoints[activity.userId];
  }

  async leaderboard() {
    const data = await this.read();
    return Object.entries(data.UserPoints)
      .map(([userId, points]) => ({ userId, displayName: data.Users[userId]?.displayName || userId, points }))
      .sort((a, b) => b.points - a.points || a.userId.localeCompare(b.userId));
  }

  async activitiesForUser(userId) {
    return (await this.read()).Activities.filter((activity) => activity.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async allActivities() { return (await this.read()).Activities.slice(); }
}

module.exports = { LocalDynamoDBRepository };
