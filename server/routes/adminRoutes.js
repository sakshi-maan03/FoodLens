import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { DietaryProfile } from '../models/DietaryProfile.js';
import { IngredientGlossary } from '../models/IngredientGlossary.js';
import { ScanHistory } from '../models/ScanHistory.js';
import { User } from '../models/User.js';

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAdmin);

adminRoutes.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [totalUsers, totalScans, totalGlossary, verdictAgg, sourceAgg] = await Promise.all([
    User.countDocuments(),
    ScanHistory.countDocuments(),
    IngredientGlossary.countDocuments(),
    ScanHistory.aggregate([{ $group: { _id: '$verdict', count: { $sum: 1 } } }]),
    ScanHistory.aggregate([{ $group: { _id: '$sourceType', count: { $sum: 1 } } }]),
  ]);

  const verdicts = {
    Compatible: 0,
    Caution: 0,
    'Not Recommended': 0,
  };
  for (const row of verdictAgg) {
    if (row._id in verdicts) {
      verdicts[row._id] = row.count;
    }
  }

  const sources = {
    barcode: 0,
    ocr: 0,
    manual: 0,
  };
  for (const row of sourceAgg) {
    if (row._id in sources) {
      sources[row._id] = row.count;
    }
  }

    res.json({
      totalUsers,
      totalScans,
      totalGlossary,
      verdicts,
      sources,
    });
  })
);

adminRoutes.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const [users, profiles, scanCounts] = await Promise.all([
    User.find({}).select('_id name email role createdAt').sort({ createdAt: -1 }).lean(),
    DietaryProfile.find({}).select('userId allergies preferences').lean(),
    ScanHistory.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 } } }]),
  ]);

  const profileMap = new Map(profiles.map((p) => [String(p.userId), p]));
  const scanCountMap = new Map(scanCounts.map((s) => [String(s._id), s.count]));

  res.json({
    users: users.map((u) => {
      const uid = String(u._id);
      const prof = profileMap.get(uid);
      return {
        id: uid,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        scanCount: scanCountMap.get(uid) || 0,
        allergiesCount: prof?.allergies?.length || 0,
        preferencesCount: prof?.preferences?.length || 0,
      };
    }),
    });
  })
);

const roleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

adminRoutes.patch(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid role value.' });
    return;
  }

  if (targetId === req.user.id && parsed.data.role !== 'admin') {
    res.status(400).json({ error: 'You cannot remove your own administrator privileges.' });
    return;
  }

  const updated = await User.findByIdAndUpdate(
    targetId,
    { $set: { role: parsed.data.role } },
    { returnDocument: 'after' }
  ).lean();

  if (!updated) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

    res.json({ message: 'User role updated.', role: updated.role });
  })
);

adminRoutes.get(
  '/scans',
  asyncHandler(async (_req, res) => {
    const scans = await ScanHistory.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      scans: scans.map((s) => ({
        id: String(s._id),
        productName: s.productName,
        brand: s.brand || '',
        barcode: s.barcode || null,
        sourceType: s.sourceType,
        verdict: s.verdict,
        summaryReason: s.summaryReason,
        createdAt: s.createdAt,
        userName: s.userId?.name || 'Unknown User',
        userEmail: s.userId?.email || '',
      })),
    });
  })
);
