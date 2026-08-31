/** AWS Lambda entry point for Cognito-authorized POST /activities. */
const { addEcoActivity } = require('./activity-service');
const { AwsDynamoDBRepository } = require('./aws-dynamodb-repository');

exports.handler = async (event, { repository } = {}) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || event.requestContext?.authorizer?.claims?.sub;
    if (!userId) return { statusCode: 401, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Cognito authentication is required.' }) };
    const result = await addEcoActivity({ ...JSON.parse(event.body || '{}'), userId }, repository || new AwsDynamoDBRepository());
    return { statusCode: 201, headers: { 'content-type': 'application/json' }, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 400, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: error.message }) };
  }
};
