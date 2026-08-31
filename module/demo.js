const { addEcoActivity } = require('./activity-service');
const { LocalDynamoDBRepository } = require('./local-dynamodb-repository');

(async () => {
  const repository = new LocalDynamoDBRepository();
  const result = await addEcoActivity({ userId: 'student-demo', type: 'recycling', timestamp: new Date().toISOString() }, repository);
  console.log(JSON.stringify({ confirmation: result, leaderboard: await repository.leaderboard() }, null, 2));
})();
