import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/config.js';
import { User } from '../models/User.js';

export const AUTH_COOKIE_NAME = 'foodlens_token';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function extractToken(req) {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await User.findById(decoded.id).select('_id name email role').lean();

    if (!dbUser) {
      res.status(401).json({ error: 'User account no longer exists.' });
      return;
    }

    req.user = {
      id: String(dbUser._id),
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required for this action.' });
    return;
  }
  next();
}
