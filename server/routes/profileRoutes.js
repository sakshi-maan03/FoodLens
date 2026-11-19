import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { DietaryProfile } from '../models/DietaryProfile.js';
import { getOrCreateUserProfile } from '../services/profileHelper.js';

export const profileRoutes = Router();

const profileUpdateSchema = z.object({
  allergies: z.array(z.string().trim().min(1).max(60)).max(30),
  preferences: z.array(z.string().trim().min(1).max(60)).max(20),
  restrictions: z.array(z.string().trim().min(1).max(80)).max(20),
  customAvoid: z.array(z.string().trim().min(1).max(60)).max(40),
  dietPlanEnabled: z.boolean(),
  dietPlanName: z.string().trim().max(100),
  dietPlanNotes: z.string().trim().max(500),
  maxSugarPer100g: z.number().min(0).max(100).nullable(),
  maxSodiumPer100g: z.number().min(0).max(10000).nullable(),
  maxCaloriesPer100g: z.number().min(0).max(1000).nullable(),
});

profileRoutes.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await getOrCreateUserProfile(req.user.id);
    res.json({ profile });
  })
);

profileRoutes.put(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid dietary profile data' });
    return;
  }

  const data = parsed.data;
  const userId = req.user.id;

  const updatedDoc = await DietaryProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        allergies: data.allergies,
        preferences: data.preferences,
        restrictions: data.restrictions,
        customAvoid: data.customAvoid,
        dietPlanEnabled: data.dietPlanEnabled,
        dietPlanName: data.dietPlanName,
        dietPlanNotes: data.dietPlanNotes,
        maxSugarPer100g: data.maxSugarPer100g,
        maxSodiumPer100g: data.maxSodiumPer100g,
        maxCaloriesPer100g: data.maxCaloriesPer100g,
      },
    },
    { upsert: true, returnDocument: 'after' }
  ).lean();

  res.json({
    profile: {
      allergies: updatedDoc.allergies || [],
      preferences: updatedDoc.preferences || [],
      restrictions: updatedDoc.restrictions || [],
      customAvoid: updatedDoc.customAvoid || [],
      dietPlanEnabled: Boolean(updatedDoc.dietPlanEnabled),
      dietPlanName: updatedDoc.dietPlanName || '',
      dietPlanNotes: updatedDoc.dietPlanNotes || '',
      maxSugarPer100g: updatedDoc.maxSugarPer100g ?? null,
      maxSodiumPer100g: updatedDoc.maxSodiumPer100g ?? null,
      maxCaloriesPer100g: updatedDoc.maxCaloriesPer100g ?? null,
      updatedAt: updatedDoc.updatedAt,
    },
    message: 'Dietary profile saved successfully.',
  });
  })
);
