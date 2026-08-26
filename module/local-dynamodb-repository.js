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
      return JSON.parse(await fs.readFile(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return { Activities: [], UserPoints: {} };
      throw error;
    }
  }

  async write(data) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async storeActivityAndIncrementPoints(activity) {
    const data = await this.read();
    data.Activities.push(activity);
    data.UserPoints[activity.userId] = (data.UserPoints[activity.userId] || 0) + activity.points;
    await this.write(data);
    return data.UserPoints[activity.userId];
  }

  async leaderboard() {
    const data = await this.read();
    return Object.entries(data.UserPoints)
      .map(([userId, points]) => ({ userId, points }))
      .sort((a, b) => b.points - a.points || a.userId.localeCompare(b.userId));
  }
}

module.exports = { LocalDynamoDBRepository };
