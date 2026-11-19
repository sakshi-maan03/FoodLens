import { DietaryProfile } from '../models/DietaryProfile.js';

export async function getOrCreateUserProfile(userId) {
  let doc = await DietaryProfile.findOne({ userId }).lean();

  if (!doc) {
    const created = await DietaryProfile.create({ userId });
    doc = created.toObject();
  }

  return {
    allergies: doc.allergies || [],
    preferences: doc.preferences || [],
    restrictions: doc.restrictions || [],
    customAvoid: doc.customAvoid || [],
    dietPlanEnabled: Boolean(doc.dietPlanEnabled),
    dietPlanName: doc.dietPlanName || '',
    dietPlanNotes: doc.dietPlanNotes || '',
    maxSugarPer100g: doc.maxSugarPer100g ?? null,
    maxSodiumPer100g: doc.maxSodiumPer100g ?? null,
    maxCaloriesPer100g: doc.maxCaloriesPer100g ?? null,
    updatedAt: doc.updatedAt,
  };
}
