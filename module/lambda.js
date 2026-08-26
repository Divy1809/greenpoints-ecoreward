/** AWS Lambda entry point. Configure API Gateway POST /activities to this handler. */
const { addEcoActivity } = require('./activity-service');

exports.handler = async (event, { repository } = {}) => {
  if (!repository) throw new Error('Inject a DynamoDB repository when deploying this handler.');
  try {
    const result = await addEcoActivity(JSON.parse(event.body || '{}'), repository);
    return { statusCode: 201, headers: { 'content-type': 'application/json' }, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 400, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: error.message }) };
  }
};
