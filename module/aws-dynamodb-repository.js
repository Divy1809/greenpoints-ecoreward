/** Optional production adapter. It is loaded only by Lambda/AWS_STORAGE=aws. */
class AwsDynamoDBRepository {
  constructor({ activitiesTable = process.env.ACTIVITIES_TABLE, pointsTable = process.env.POINTS_TABLE } = {}) {
    if (!activitiesTable || !pointsTable) throw new Error('ACTIVITIES_TABLE and POINTS_TABLE must be configured for AWS storage.');
    const sdk = require('@aws-sdk/client-dynamodb');
    this.client = new sdk.DynamoDBClient({}); this.commands = sdk; this.activitiesTable = activitiesTable; this.pointsTable = pointsTable;
  }
  async storeActivityAndIncrementPoints(activity) {
    const { TransactWriteItemsCommand, GetItemCommand } = this.commands;
    await this.client.send(new TransactWriteItemsCommand({ TransactItems: [
      { Put: { TableName: this.activitiesTable, Item: { userId: { S: activity.userId }, activityId: { S: activity.activityId }, type: { S: activity.type }, points: { N: String(activity.points) }, timestamp: { S: activity.timestamp }, createdAt: { S: activity.createdAt } } } },
      { Update: { TableName: this.pointsTable, Key: { userId: { S: activity.userId } }, UpdateExpression: 'ADD totalPoints :points', ExpressionAttributeValues: { ':points': { N: String(activity.points) } } } },
    ] }));
    const result = await this.client.send(new GetItemCommand({ TableName: this.pointsTable, Key: { userId: { S: activity.userId } }, ConsistentRead: true }));
    return Number(result.Item?.totalPoints?.N || 0);
  }
}
module.exports = { AwsDynamoDBRepository };
