/**
 * Start locally: npm start
 * Then open http://localhost:3000 or POST JSON to /activities.
 * Cloud equivalent: API Gateway routes POST /activities to a Lambda running
 * activity-service.js, which writes to Amazon DynamoDB.
 */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { addEcoActivity } = require('./activity-service');
const { LocalDynamoDBRepository } = require('./local-dynamodb-repository');

const repository = new LocalDynamoDBRepository();
const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(await fs.readFile(path.join(__dirname, 'public', 'index.html')));
  }
  if (req.method === 'GET' && req.url === '/leaderboard') return sendJson(res, 200, await repository.leaderboard());
  if (req.method === 'POST' && req.url === '/activities') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try { sendJson(res, 201, await addEcoActivity(JSON.parse(body), repository)); }
      catch (error) { sendJson(res, 400, { error: error.message }); }
    });
    return;
  }
  sendJson(res, 404, { error: 'Route not found.' });
});

if (require.main === module) server.listen(3000, () => console.log('GreenPoints module: http://localhost:3000'));
module.exports = { server };
