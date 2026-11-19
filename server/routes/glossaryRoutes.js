import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { IngredientGlossary } from '../models/IngredientGlossary.js';

export const glossaryRoutes = Router();

function serializeGlossary(doc) {
  return {
    id: String(doc._id),
    canonicalName: doc.canonicalName,
    aliases: doc.aliases || [],
    eNumber: doc.eNumber || null,
    category: doc.category,
    plainExplanation: doc.plainExplanation,
    purpose: doc.purpose || '',
    dietaryFlags: doc.dietaryFlags || [],
    defaultCaution: Boolean(doc.defaultCaution),
    cautionReason: doc.cautionReason || null,
    updatedAt: doc.updatedAt,
  };
}

glossaryRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : 'All';

    const docs = await IngredientGlossary.find({}).sort({ canonicalName: 1 }).lean();
    const categories = Array.from(new Set(docs.map((d) => d.category))).sort();

    const filtered = docs.filter((doc) => {
      if (category !== 'All' && doc.category !== category) return false;
      if (search) {
        const hay = `${doc.canonicalName} ${doc.eNumber || ''} ${(doc.aliases || []).join(' ')} ${doc.plainExplanation} ${doc.category}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    res.json({
      items: filtered.map(serializeGlossary),
      categories,
      totalCount: docs.length,
    });
  })
);

const glossaryUpsertSchema = z.object({
  canonicalName: z.string().trim().min(2).max(120),
  aliases: z.array(z.string().trim().min(1)).default([]),
  eNumber: z.string().trim().max(30).nullable().optional().default(null),
  category: z.string().trim().min(2).max(80),
  plainExplanation: z.string().trim().min(5).max(500),
  purpose: z.string().trim().max(300).optional().default(''),
  dietaryFlags: z.array(z.string().trim().min(1)).default([]),
  defaultCaution: z.boolean().default(false),
  cautionReason: z.string().trim().max(300).nullable().optional().default(null),
});

glossaryRoutes.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = glossaryUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid glossary entry.' });
    return;
  }

  const d = parsed.data;
  try {
    const created = await IngredientGlossary.create({
      canonicalName: d.canonicalName,
      aliases: d.aliases,
      eNumber: d.eNumber || null,
      category: d.category,
      plainExplanation: d.plainExplanation,
      purpose: d.purpose,
      dietaryFlags: d.dietaryFlags,
      defaultCaution: d.defaultCaution,
      cautionReason: d.cautionReason || null,
    });

    res.status(201).json({ item: serializeGlossary(created.toObject()) });
  } catch (err) {
    const isDuplicate = err && typeof err === 'object' && err.code === 11000;
    res.status(409).json({
      error: isDuplicate
        ? 'An ingredient entry with this canonical name already exists.'
        : 'Failed to create glossary entry.',
    });
  }
});

glossaryRoutes.put(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Glossary entry not found.' });
      return;
    }

    const parsed = glossaryUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid glossary entry.' });
      return;
    }

    const d = parsed.data;
    try {
      const updated = await IngredientGlossary.findByIdAndUpdate(
        id,
        {
          $set: {
            canonicalName: d.canonicalName,
            aliases: d.aliases,
            eNumber: d.eNumber || null,
            category: d.category,
            plainExplanation: d.plainExplanation,
            purpose: d.purpose,
            dietaryFlags: d.dietaryFlags,
            defaultCaution: d.defaultCaution,
            cautionReason: d.cautionReason || null,
          },
        },
        { returnDocument: 'after' }
      ).lean();

      if (!updated) {
        res.status(404).json({ error: 'Glossary entry not found.' });
        return;
      }

      res.json({ item: serializeGlossary(updated) });
    } catch (err) {
      const isDuplicate = err && typeof err === 'object' && err.code === 11000;
      res.status(isDuplicate ? 409 : 500).json({
        error: isDuplicate
          ? 'An ingredient entry with this canonical name already exists.'
          : 'Failed to update glossary entry.',
      });
    }
  })
);

glossaryRoutes.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Glossary entry not found.' });
      return;
    }

    const deleted = await IngredientGlossary.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ error: 'Glossary entry not found.' });
      return;
    }

    res.json({ message: 'Glossary entry removed.' });
  })
);
