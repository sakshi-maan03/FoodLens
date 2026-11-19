import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ScanHistory } from '../models/ScanHistory.js';
import { getOrCreateUserProfile } from '../services/profileHelper.js';
import { analyzeProductCompatibility } from '../services/ruleEngine.js';

export const historyRoutes = Router();

function serializeHistoryDoc(doc) {
  return {
    id: String(doc._id),
    productName: doc.productName,
    brand: doc.brand || '',
    barcode: doc.barcode || null,
    imageUrl: doc.imageUrl || null,
    sourceType: doc.sourceType,
    rawIngredientsText: doc.rawIngredientsText,
    verdict: doc.verdict,
    summaryReason: doc.summaryReason,
    conflicts: doc.conflicts || [],
    ingredientsBreakdown: doc.ingredientsBreakdown || [],
    nutrition: doc.nutrition || {},
    isBookmarked: Boolean(doc.isBookmarked),
    userNotes: doc.userNotes || '',
    createdAt: doc.createdAt,
  };
}

historyRoutes.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const verdict = typeof req.query.verdict === 'string' ? req.query.verdict : 'All';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const bookmarkedOnly = req.query.bookmarked === 'true';

  const docs = await ScanHistory.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const filtered = docs.filter((doc) => {
    if (verdict !== 'All' && doc.verdict !== verdict) return false;
    if (bookmarkedOnly && !doc.isBookmarked) return false;
    if (search) {
      const hay = `${doc.productName} ${doc.brand || ''} ${doc.barcode || ''} ${doc.rawIngredientsText}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const stats = {
    total: docs.length,
    compatible: docs.filter((d) => d.verdict === 'Compatible').length,
    caution: docs.filter((d) => d.verdict === 'Caution').length,
    notRecommended: docs.filter((d) => d.verdict === 'Not Recommended').length,
    bookmarked: docs.filter((d) => d.isBookmarked).length,
  };

    res.json({
      items: filtered.map(serializeHistoryDoc),
      stats,
    });
  })
);

historyRoutes.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ error: 'Scan history record not found.' });
    return;
  }

  const doc = await ScanHistory.findOne({ _id: id, userId: req.user.id }).lean();
  if (!doc) {
    res.status(404).json({ error: 'Scan history record not found.' });
    return;
  }

    res.json({ item: serializeHistoryDoc(doc) });
  })
);

const patchSchema = z.object({
  isBookmarked: z.boolean().optional(),
  userNotes: z.string().max(1000).optional(),
});

historyRoutes.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ error: 'Scan history record not found.' });
    return;
  }

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid update fields.' });
    return;
  }

  const updateFields = {};
  if (parsed.data.isBookmarked !== undefined) updateFields.isBookmarked = parsed.data.isBookmarked;
  if (parsed.data.userNotes !== undefined) updateFields.userNotes = parsed.data.userNotes;

  const updated = await ScanHistory.findOneAndUpdate(
    { _id: id, userId: req.user.id },
    { $set: updateFields },
    { returnDocument: 'after' }
  ).lean();

  if (!updated) {
    res.status(404).json({ error: 'Scan history record not found.' });
    return;
  }

    res.json({ item: serializeHistoryDoc(updated) });
  })
);

historyRoutes.post(
  '/:id/recheck',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ error: 'Scan history record not found.' });
    return;
  }

  const existing = await ScanHistory.findOne({ _id: id, userId: req.user.id });
  if (!existing) {
    res.status(404).json({ error: 'Scan history record not found.' });
    return;
  }

  const profile = await getOrCreateUserProfile(req.user.id);
  const analysis = await analyzeProductCompatibility({
    rawIngredientsText: existing.rawIngredientsText,
    nutrition: existing.nutrition || {},
    profile,
  });

  existing.verdict = analysis.verdict;
  existing.summaryReason = analysis.summaryReason;
  existing.conflicts = analysis.conflicts;
  existing.ingredientsBreakdown = analysis.ingredientsBreakdown;
  await existing.save();

    res.json({ item: serializeHistoryDoc(existing.toObject()) });
  })
);

historyRoutes.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Scan history record not found.' });
      return;
    }

    const deleted = await ScanHistory.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) {
      res.status(404).json({ error: 'Scan history record not found.' });
      return;
    }

    res.json({ message: 'Scan record deleted.' });
  })
);
