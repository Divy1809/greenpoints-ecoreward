/**
 * Start locally: npm start
 * Then open http://localhost:3000. Create an account before recording activity.
 * Cloud equivalent: Cognito authenticates users, API Gateway invokes Lambda,
 * and DynamoDB replaces the local adapter.
 */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { addEcoActivity, ACTIVITY_CATALOG } = require('./activity-service');
const { LocalDynamoDBRepository } = require('./local-dynamodb-repository');
const { LocalAuthService } = require('./auth-service');
const { dashboardForUser, monthlyReport } = require('./dashboard-service');

const repository = new LocalDynamoDBRepository(process.env.LOCAL_DB_PATH);
const auth = new LocalAuthService(repository);
const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
  res.end(JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve, reject) => { let body = ''; req.on('data', (chunk) => { body += chunk; if (body.length > 100000) reject(new Error('Request body is too large.')); }); req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Request body must be valid JSON.')); } }); });
const requireUser = async (req, res) => { const user = await auth.authenticate(req.headers); if (!user) { sendJson(res, 401, { error: 'Please log in to continue.' }); return null; } return user; };

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  const url = new URL(req.url, 'http://localhost:3000');
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(await fs.readFile(path.join(__dirname, 'public', 'index.html')));
  }
  try {
    if (req.method === 'GET' && url.pathname === '/activity-types') return sendJson(res, 200, ACTIVITY_CATALOG);
    if (req.method === 'POST' && url.pathname === '/auth/signup') return sendJson(res, 201, await auth.signup(await readBody(req)));
    if (req.method === 'POST' && url.pathname === '/auth/login') return sendJson(res, 200, await auth.login(await readBody(req)));
    if (req.method === 'POST' && url.pathname === '/auth/logout') { auth.logout(req.headers); return sendJson(res, 204, {}); }
    if (req.method === 'GET' && url.pathname === '/auth/me') { const user = await requireUser(req, res); return user && sendJson(res, 200, { user }); }
    if (req.method === 'GET' && url.pathname === '/leaderboard') {
      const user = await auth.authenticate(req.headers); const entries = await repository.leaderboard();
      return sendJson(res, 200, entries.map((entry, index) => ({ ...entry, rank: index + 1, isCurrentUser: entry.userId === user?.userId })));
    }
    const user = await requireUser(req, res); if (!user) return;
    if (req.method === 'GET' && url.pathname === '/dashboard') return sendJson(res, 200, await dashboardForUser(user, repository));
    if (req.method === 'GET' && url.pathname === '/activities') return sendJson(res, 200, await repository.activitiesForUser(user.userId));
    if (req.method === 'GET' && url.pathname === '/reports/monthly') return sendJson(res, 200, monthlyReport(await repository.activitiesForUser(user.userId), url.searchParams.get('month') || undefined));
    if (req.method === 'POST' && url.pathname === '/activities') {
      const result = await addEcoActivity({ ...(await readBody(req)), userId: user.userId }, repository);
      return sendJson(res, 201, { ...result, dashboard: await dashboardForUser(user, repository) });
    }
    return sendJson(res, 404, { error: 'Route not found.' });
  } catch (error) { return sendJson(res, 400, { error: error.message }); }
});

if (require.main === module) { const port = Number(process.env.PORT || 3000); server.listen(port, () => console.log(`GreenPoints module: http://localhost:${port}`)); }
module.exports = { server };
