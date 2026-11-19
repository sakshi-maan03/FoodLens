import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { ScanHistory } from '../models/ScanHistory.js';
import { fetchProductWithSources } from '../services/openFoodFacts.js';
import { getOrCreateUserProfile } from '../services/profileHelper.js';
import { analyzeProductCompatibility } from '../services/ruleEngine.js';

export const productRoutes = Router();

const analyzePayloadSchema = z.object({
  productName: z.string().trim().min(1, 'Product name is required').max(150),
  brand: z.string().trim().max(120).optional().default(''),
  barcode: z.string().trim().max(64).nullable().optional().default(null),
  imageUrl: z.string().trim().max(500).nullable().optional().default(null),
  sourceType: z.enum(['barcode', 'ocr', 'manual']),
  rawIngredientsText: z.string().trim().min(2, 'Please provide ingredients text to analyze').max(6000),
  allergensTags: z.array(z.string()).optional().default([]),
  tracesTags: z.array(z.string()).optional().default([]),
  additivesTags: z.array(z.string()).optional().default([]),
  labelsTags: z.array(z.string()).optional().default([]),
  nutrition: z
    .object({
      caloriesPer100g: z.number().nullable().optional(),
      sugarPer100g: z.number().nullable().optional(),
      saltPer100g: z.number().nullable().optional(),
      sodiumPer100g: z.number().nullable().optional(),
      fatPer100g: z.number().nullable().optional(),
      saturatedFatPer100g: z.number().nullable().optional(),
      carbsPer100g: z.number().nullable().optional(),
      proteinPer100g: z.number().nullable().optional(),
    })
    .optional()
    .default({}),
  saveToHistory: z.boolean().optional().default(true),
});

productRoutes.get('/barcode/:barcode', requireAuth, async (req, res) => {
  try {
    const rawParam = req.params.barcode;
    const barcode = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    const saveFlag = req.query.save !== 'false';

    const { product: externalProduct, sanitized, candidates, checkedSources } =
      await fetchProductWithSources(barcode);

    let product = externalProduct;

    if (!product) {
      const savedManualEntry = await ScanHistory.findOne({
        userId: req.user.id,
        barcode: { $in: candidates },
        sourceType: { $in: ['manual', 'ocr'] },
      })
        .sort({ createdAt: -1 })
        .lean();

      if (savedManualEntry && savedManualEntry.rawIngredientsText) {
        product = {
          barcode: savedManualEntry.barcode || sanitized,
          productName: savedManualEntry.productName,
          brand: savedManualEntry.brand || '',
          quantity: '',
          imageUrl: savedManualEntry.imageUrl || null,
          categories: [],
          ingredientsText: savedManualEntry.rawIngredientsText,
          allergensTags: [],
          tracesTags: [],
          additivesTags: [],
          labelsTags: [],
          nutriscoreGrade: null,
          novaGroup: null,
          nutrition: savedManualEntry.nutrition || {},
          sourceApi: 'saved_manual_entry',
        };
      }
    }

    if (!product) {
      res.status(404).json({
        notFound: true,
        barcode: sanitized || barcode,
        candidates,
        checkedSources,
        error: `Barcode "${sanitized || barcode}" was detected successfully, but this product is not available in our connected databases.`,
      });
      return;
    }

    const profile = await getOrCreateUserProfile(req.user.id);
    const analysis = await analyzeProductCompatibility({
      rawIngredientsText: product.ingredientsText,
      allergensTags: product.allergensTags,
      tracesTags: product.tracesTags,
      additivesTags: product.additivesTags,
      labelsTags: product.labelsTags,
      nutrition: product.nutrition,
      profile,
    });

    let scanId = null;
    if (saveFlag) {
      const created = await ScanHistory.create({
        userId: req.user.id,
        productName: product.productName,
        brand: product.brand,
        barcode: product.barcode,
        imageUrl: product.imageUrl,
        sourceType: 'barcode',
        rawIngredientsText: product.ingredientsText || 'Ingredient list not supplied by barcode API.',
        verdict: analysis.verdict,
        summaryReason: analysis.summaryReason,
        conflicts: analysis.conflicts,
        ingredientsBreakdown: analysis.ingredientsBreakdown,
        nutrition: product.nutrition,
      });
      scanId = String(created._id);
    }

    res.json({
      scanId,
      product,
      analysis,
      checkedSources,
      profileSnapshot: {
        allergies: profile.allergies,
        preferences: profile.preferences,
        restrictions: profile.restrictions,
        dietPlanEnabled: profile.dietPlanEnabled,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Barcode lookup failed.';
    res.status(502).json({ error: message });
  }
});

productRoutes.post('/analyze', requireAuth, async (req, res) => {
  try {
    const parsed = analyzePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid analysis payload' });
      return;
    }

    const data = parsed.data;
    const profile = await getOrCreateUserProfile(req.user.id);

    const analysis = await analyzeProductCompatibility({
      rawIngredientsText: data.rawIngredientsText,
      allergensTags: data.allergensTags,
      tracesTags: data.tracesTags,
      additivesTags: data.additivesTags,
      labelsTags: data.labelsTags,
      nutrition: data.nutrition,
      profile,
    });

    let scanId = null;
    if (data.saveToHistory) {
      const created = await ScanHistory.create({
        userId: req.user.id,
        productName: data.productName,
        brand: data.brand,
        barcode: data.barcode,
        imageUrl: data.imageUrl,
        sourceType: data.sourceType,
        rawIngredientsText: data.rawIngredientsText,
        verdict: analysis.verdict,
        summaryReason: analysis.summaryReason,
        conflicts: analysis.conflicts,
        ingredientsBreakdown: analysis.ingredientsBreakdown,
        nutrition: data.nutrition || {},
      });
      scanId = String(created._id);
    }

    res.json({
      scanId,
      product: {
        barcode: data.barcode || '',
        productName: data.productName,
        brand: data.brand,
        quantity: '',
        imageUrl: data.imageUrl,
        categories: [],
        ingredientsText: data.rawIngredientsText,
        allergensTags: data.allergensTags,
        tracesTags: data.tracesTags,
        additivesTags: data.additivesTags,
        labelsTags: data.labelsTags,
        nutriscoreGrade: null,
        novaGroup: null,
        nutrition: data.nutrition,
      },
      analysis,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Analysis failed.' });
  }
});
