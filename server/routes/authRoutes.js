import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { AUTH_COOKIE_NAME, requireAuth, signToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { User } from '../models/User.js';
import { getOrCreateUserProfile } from '../services/profileHelper.js';

export const authRoutes = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(128).optional(),
});

function setAuthCookie(req, res, token) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

authRoutes.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
      return;
    }

    const { name, email, password } = parsed.data;
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user';
    const passwordHash = bcrypt.hashSync(password, 10);

    const createdUser = await User.create({
      name,
      email,
      passwordHash,
      role,
    });

    const userId = String(createdUser._id);
    const profile = await getOrCreateUserProfile(createdUser._id);
    const userPayload = {
      id: userId,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
    };
    const token = signToken(userPayload);

    setAuthCookie(req, res, token);
    res.status(201).json({ user: userPayload, profile, token });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Registration failed.' });
  }
});

authRoutes.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid login credentials' });
      return;
    }

    const { email, password } = parsed.data;
    const userDoc = await User.findOne({ email }).lean();

    if (!userDoc || !bcrypt.compareSync(password, userDoc.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const profile = await getOrCreateUserProfile(userDoc._id);
    const userPayload = {
      id: String(userDoc._id),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
    };
    const token = signToken(userPayload);

    setAuthCookie(req, res, token);
    res.json({ user: userPayload, profile, token });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Login failed.' });
  }
});

authRoutes.post('/logout', (req, res) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(AUTH_COOKIE_NAME, {
    path: '/',
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
  });
  res.json({ message: 'Signed out successfully.' });
});

authRoutes.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const profile = await getOrCreateUserProfile(user.id);
    res.json({ user, profile });
  })
);

authRoutes.patch('/me', requireAuth, async (req, res) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid account update' });
      return;
    }

    const user = req.user;
    const { name, currentPassword, newPassword } = parsed.data;
    const userDoc = await User.findById(user.id);
    if (!userDoc) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to set a new password.' });
        return;
      }
      if (!bcrypt.compareSync(currentPassword, userDoc.passwordHash)) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }
      userDoc.passwordHash = bcrypt.hashSync(newPassword, 10);
    }

    if (name) {
      userDoc.name = name;
    }

    await userDoc.save();

    const updated = {
      id: String(userDoc._id),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
    };

    const token = signToken(updated);
    setAuthCookie(req, res, token);
    res.json({ user: updated, token });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Account update failed.' });
  }
});
