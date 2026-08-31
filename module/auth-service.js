const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const safeUser = (user) => ({ userId: user.userId, displayName: user.displayName, createdAt: user.createdAt });

class LocalAuthService {
  constructor(repository) { this.repository = repository; this.sessions = new Map(); }
  async signup({ userId, displayName, password }) {
    const normalizedId = String(userId || '').trim().toLowerCase(); const name = String(displayName || '').trim();
    if (!/^[a-z0-9_-]{3,32}$/.test(normalizedId)) throw new Error('User ID must be 3–32 lowercase letters, numbers, hyphens, or underscores.');
    if (name.length < 2 || name.length > 60) throw new Error('Display name must be 2–60 characters.');
    if (String(password || '').length < 8) throw new Error('Password must contain at least 8 characters.');
    const salt = crypto.randomBytes(16).toString('hex'); const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
    return this.createSession(await this.repository.createUser({ userId: normalizedId, displayName: name, passwordHash, salt, createdAt: new Date().toISOString() }));
  }
  async login({ userId, password }) {
    const user = await this.repository.getUser(String(userId || '').trim().toLowerCase());
    if (!user?.passwordHash || !user?.salt) throw new Error('Invalid user ID or password.');
    const candidate = Buffer.from((await scrypt(String(password || ''), user.salt, 64)).toString('hex'), 'hex'); const stored = Buffer.from(user.passwordHash, 'hex');
    if (candidate.length !== stored.length || !crypto.timingSafeEqual(candidate, stored)) throw new Error('Invalid user ID or password.');
    return this.createSession(user);
  }
  createSession(user) { const token = crypto.randomBytes(32).toString('base64url'); this.sessions.set(token, { userId: user.userId, expiresAt: Date.now() + 28800000 }); return { token, user: safeUser(user) }; }
  async authenticate(headers = {}) { const value = headers.authorization || headers.Authorization || ''; const token = value.startsWith('Bearer ') ? value.slice(7) : ''; const session = this.sessions.get(token); if (!session || session.expiresAt < Date.now()) { if (token) this.sessions.delete(token); return null; } const user = await this.repository.getUser(session.userId); return user ? safeUser(user) : null; }
  logout(headers = {}) { const value = headers.authorization || headers.Authorization || ''; this.sessions.delete(value.startsWith('Bearer ') ? value.slice(7) : ''); }
}
module.exports = { LocalAuthService, safeUser };
