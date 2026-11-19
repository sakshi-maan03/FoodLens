import { IngredientGlossary } from '../models/IngredientGlossary.js';

const ALLERGY_SYNONYMS = {
  peanuts: ['peanut', 'peanuts', 'groundnut', 'groundnuts', 'arachis', 'monkey nut'],
  'tree nuts': [
    'almond',
    'almonds',
    'hazelnut',
    'hazelnuts',
    'cashew',
    'cashews',
    'walnut',
    'walnuts',
    'pistachio',
    'pecan',
    'macadamia',
    'brazil nut',
    'pine nut',
    'tree nut',
    'praline',
    'marzipan',
  ],
  'dairy / milk': [
    'milk',
    'dairy',
    'whey',
    'casein',
    'caseinate',
    'lactose',
    'butter',
    'butterfat',
    'ghee',
    'cream',
    'cheese',
    'yogurt',
    'curd',
    'milk solids',
    'skimmed milk',
    'skim milk',
    'buttermilk',
    'paneer',
    'khoya',
  ],
  eggs: ['egg', 'eggs', 'albumin', 'albumen', 'ovalbumin', 'lysozyme', 'e1105', 'mayonnaise', 'meringue'],
  soy: ['soy', 'soya', 'soybean', 'soybeans', 'edamame', 'tofu', 'tempeh', 'soy lecithin', 'soya lecithin', 'textured vegetable protein', 'tvp'],
  'wheat / gluten': [
    'wheat',
    'maida',
    'gluten',
    'barley',
    'rye',
    'triticale',
    'semolina',
    'suji',
    'sooji',
    'spelt',
    'kamut',
    'durum',
    'malt',
    'couscous',
    'seitan',
    'atta',
  ],
  fish: ['fish', 'anchovy', 'anchovies', 'cod', 'salmon', 'tuna', 'sardine', 'mackerel', 'fish oil', 'isinglass', 'worcestershire'],
  shellfish: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'clam', 'mussel', 'oyster', 'scallop', 'crustacean', 'mollusc'],
  sesame: ['sesame', 'tahini', 'gingelly', 'til', 'benne', 'sesamol'],
  mustard: ['mustard', 'mustard seed', 'mustard oil', 'dijon'],
  sulphites: ['sulphite', 'sulfite', 'sulphites', 'sulfites', 'metabisulphite', 'metabisulfite', 'sulfur dioxide', 'e220', 'e221', 'e222', 'e223', 'e224', 'e226', 'e227', 'e228'],
};

const PREFERENCE_CONFLICT_KEYWORDS = {
  vegetarian: {
    hard: ['meat', 'chicken', 'beef', 'pork', 'mutton', 'lamb', 'bacon', 'ham', 'sausage', 'fish', 'anchovy', 'anchovies', 'shrimp', 'prawn', 'crab', 'gelatin', 'gelatine', 'e441', 'lard', 'tallow', 'suet', 'carmine', 'cochineal', 'e120', 'shellac', 'e904', 'isinglass', 'animal rennet', 'bone char'],
    caution: ['e471', 'mono- and diglycerides', 'monoglycerides', 'diglycerides', 'rennet', 'enzymes', 'natural flavor', 'natural flavour', 'e631', 'e635', 'e627', 'stearic acid', 'e481'],
    flags: ['non-veg'],
    label: 'Vegetarian',
  },
  vegan: {
    hard: ['meat', 'chicken', 'beef', 'pork', 'fish', 'shrimp', 'gelatin', 'gelatine', 'e441', 'lard', 'tallow', 'carmine', 'e120', 'shellac', 'e904', 'milk', 'dairy', 'whey', 'casein', 'caseinate', 'lactose', 'butter', 'ghee', 'cream', 'cheese', 'yogurt', 'egg', 'eggs', 'albumin', 'honey', 'beeswax', 'e901', 'lanolin', 'vitamin d3'],
    caution: ['e471', 'mono- and diglycerides', 'natural flavor', 'natural flavour', 'enzymes', 'e631', 'e635', 'e481', 'lecithin'],
    flags: ['non-veg', 'non-vegan', 'dairy', 'egg'],
    label: 'Vegan',
  },
  'jain vegetarian': {
    hard: ['meat', 'chicken', 'beef', 'pork', 'fish', 'egg', 'eggs', 'gelatin', 'e441', 'carmine', 'e120', 'honey', 'onion', 'garlic', 'potato', 'potato starch', 'carrot', 'beetroot', 'radish', 'ginger', 'turmeric', 'shallot', 'leek', 'yam', 'sweet potato'],
    caution: ['e471', 'natural flavor', 'natural flavour', 'yeast', 'starch', 'modified starch', 'spices', 'seasoning'],
    flags: ['non-veg', 'non-jain', 'root-vegetable'],
    label: 'Jain Vegetarian',
  },
  eggetarian: {
    hard: ['meat', 'chicken', 'beef', 'pork', 'mutton', 'fish', 'anchovy', 'shrimp', 'gelatin', 'gelatine', 'e441', 'lard', 'tallow', 'carmine', 'e120'],
    caution: ['e471', 'rennet', 'e631', 'e635'],
    flags: ['non-veg'],
    label: 'Eggetarian',
  },
  pescatarian: {
    hard: ['meat', 'chicken', 'beef', 'pork', 'mutton', 'lamb', 'bacon', 'ham', 'lard', 'tallow', 'carmine', 'e120'],
    caution: ['gelatin', 'e441', 'e471'],
    flags: [],
    label: 'Pescatarian',
  },
  halal: {
    hard: ['pork', 'bacon', 'ham', 'lard', 'porcine', 'alcohol', 'ethanol', 'ethyl alcohol', 'wine', 'beer', 'rum', 'brandy', 'whisky', 'carmine', 'e120'],
    caution: ['gelatin', 'gelatine', 'e441', 'e471', 'mono- and diglycerides', 'rennet', 'enzymes', 'vanilla extract', 'e481'],
    flags: ['non-halal'],
    label: 'Halal',
  },
  kosher: {
    hard: ['pork', 'bacon', 'ham', 'lard', 'shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'clam', 'oyster', 'carmine', 'e120'],
    caution: ['gelatin', 'e441', 'e471', 'rennet', 'enzymes', 'grape juice', 'wine vinegar'],
    flags: [],
    label: 'Kosher',
  },
  'gluten-free': {
    hard: ['wheat', 'maida', 'gluten', 'barley', 'rye', 'triticale', 'semolina', 'suji', 'spelt', 'malt', 'atta', 'couscous', 'seitan', 'brewer yeast'],
    caution: ['oats', 'oat flour', 'modified food starch', 'hydrolyzed vegetable protein', 'soy sauce'],
    flags: ['gluten', 'wheat'],
    label: 'Gluten-Free',
  },
  'dairy-free': {
    hard: ['milk', 'dairy', 'whey', 'casein', 'caseinate', 'lactose', 'butter', 'ghee', 'cream', 'cheese', 'yogurt', 'curd', 'buttermilk', 'milk solids', 'paneer'],
    caution: ['lactic acid', 'natural butter flavor', 'chocolate'],
    flags: ['dairy', 'milk', 'lactose'],
    label: 'Dairy-Free',
  },
  'low-sugar': {
    hard: ['high fructose corn syrup', 'hfcs', 'glucose-fructose syrup', 'invert sugar', 'liquid glucose', 'corn syrup', 'cane sugar', 'sugar', 'sucrose', 'dextrose', 'fructose', 'maltose', 'golden syrup', 'caramel'],
    caution: ['maltodextrin', 'honey', 'maple syrup', 'agave', 'fruit juice concentrate', 'date syrup'],
    flags: ['added-sugar'],
    label: 'Low-Sugar',
  },
  'low-sodium': {
    hard: ['monosodium glutamate', 'msg', 'e621', 'sodium nitrite', 'e250', 'brine', 'soy sauce'],
    caution: ['salt', 'sea salt', 'iodized salt', 'sodium benzoate', 'e211', 'sodium bicarbonate', 'baking soda', 'sodium phosphate', 'disodium guanylate', 'e627', 'disodium inosinate', 'e631'],
    flags: ['high-sodium'],
    label: 'Low-Sodium',
  },
  keto: {
    hard: ['sugar', 'sucrose', 'high fructose corn syrup', 'hfcs', 'corn syrup', 'dextrose', 'maltodextrin', 'wheat flour', 'maida', 'rice flour', 'corn starch', 'potato starch', 'tapioca starch', 'honey', 'oats', 'rice'],
    caution: ['starch', 'milk', 'lactose', 'sorbitol', 'maltitol'],
    flags: ['added-sugar', 'high-glycemic', 'high-carb'],
    label: 'Keto / Low-Carb',
  },
};

const RESTRICTION_RULES = {
  'avoid palm oil': {
    keywords: ['palm oil', 'palmolein', 'palm kernel', 'edible vegetable oil (palm)', 'fractionated palm', 'palmitate'],
    flags: ['palm-oil'],
    label: 'Avoid Palm Oil',
  },
  'avoid artificial sweeteners': {
    keywords: ['aspartame', 'e951', 'acesulfame', 'e950', 'sucralose', 'e955', 'saccharin', 'e954', 'neotame', 'e961', 'advantame', 'cyclamate', 'e952'],
    flags: ['artificial-sweetener'],
    label: 'Avoid Artificial Sweeteners',
  },
  'avoid artificial colors': {
    keywords: ['tartrazine', 'e102', 'yellow 5', 'sunset yellow', 'e110', 'yellow 6', 'allura red', 'e129', 'red 40', 'brilliant blue', 'e133', 'blue 1', 'carmoisine', 'e122', 'ponceau', 'e124', 'erythrosine', 'e127', 'indigo carmine', 'e132', 'synthetic food colour', 'artificial color'],
    flags: ['artificial-color'],
    label: 'Avoid Artificial Colors',
  },
  'avoid msg / flavor enhancers': {
    keywords: ['monosodium glutamate', 'msg', 'e621', 'ins 621', 'e627', 'e631', 'e635', 'disodium guanylate', 'disodium inosinate', 'hydrolyzed vegetable protein', 'autolyzed yeast extract'],
    flags: ['msg'],
    label: 'Avoid MSG / Flavor Enhancers',
  },
  'avoid preservatives': {
    keywords: ['sodium benzoate', 'e211', 'potassium sorbate', 'e202', 'tbhq', 'e319', 'bha', 'e320', 'bht', 'e321', 'sodium nitrite', 'e250', 'calcium propionate', 'e282', 'sorbic acid', 'e200', 'metabisulphite', 'e223', 'e224', 'preservative'],
    flags: ['preservative'],
    label: 'Avoid Preservatives',
  },
  'avoid trans fats / hydrogenated oils': {
    keywords: ['partially hydrogenated', 'hydrogenated vegetable oil', 'hydrogenated palm', 'vanaspati', 'shortening', 'interesterified fat'],
    flags: ['trans-fat'],
    label: 'Avoid Trans Fats / Hydrogenated Oils',
  },
  'avoid high-fructose corn syrup': {
    keywords: ['high fructose corn syrup', 'high-fructose corn syrup', 'hfcs', 'glucose-fructose syrup', 'isoglucose'],
    flags: ['hfcs'],
    label: 'Avoid High-Fructose Corn Syrup',
  },
  'avoid caffeine': {
    keywords: ['caffeine', 'coffee extract', 'guarana', 'green tea extract', 'yerba mate', 'espresso'],
    flags: ['caffeine'],
    label: 'Avoid Caffeine',
  },
};

export function splitIngredientsText(rawText) {
  if (!rawText || !rawText.trim()) {
    return { ingredients: [], tracesClause: '' };
  }

  let working = rawText
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^ingredients?\s*[:\-–]\s*/i, '')
    .trim();

  let tracesClause = '';
  const tracesMatch = working.match(/(may contain(?:\s+traces\s+of)?|traces\s*[:\-]|manufactured in a facility[^.]*)/i);
  if (tracesMatch && tracesMatch.index !== undefined) {
    tracesClause = working.slice(tracesMatch.index).trim();
    working = working.slice(0, tracesMatch.index).trim();
  }

  const tokens = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < working.length; i++) {
    const ch = working[i];
    if (ch === '(' || ch === '[') {
      depth++;
      current += ch;
    } else if (ch === ')' || ch === ']') {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if ((ch === ',' || ch === ';' || ch === '•') && depth === 0) {
      if (current.trim()) tokens.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) tokens.push(current.trim());

  const cleaned = tokens
    .map((t) =>
      t
        .replace(/\.+$/, '')
        .replace(/^\d+(\.\d+)?%\s*/, '')
        .trim()
    )
    .filter((t) => t.length > 1 && t.length < 180);

  return { ingredients: cleaned, tracesClause };
}

function containsKeyword(haystack, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
  return regex.test(haystack);
}

function simplifyPlainName(raw) {
  return raw
    .replace(/\(\s*\d+(?:\.\d+)?\s*%\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function analyzeProductCompatibility(input) {
  const glossaryEntries = await IngredientGlossary.find({}).lean();

  const { ingredients, tracesClause } = splitIngredientsText(input.rawIngredientsText);
  const combinedTracesText = [tracesClause, ...(input.tracesTags || [])].join(' ').toLowerCase();
  const combinedAllergensTags = (input.allergensTags || []).join(' ').toLowerCase();
  const combinedLabels = (input.labelsTags || []).map((l) => l.toLowerCase());
  const isCertifiedVeganLabel = combinedLabels.some((l) => l === 'vegan' || l.includes('certified vegan'));
  const isCertifiedVegLabel = isCertifiedVeganLabel || combinedLabels.some((l) => l === 'vegetarian');

  const conflicts = [];
  const breakdown = [];

  const addConflict = (conflict) => {
    const duplicate = conflicts.some(
      (c) =>
        c.matchedIngredient.toLowerCase() === conflict.matchedIngredient.toLowerCase() &&
        c.userRequirement.toLowerCase() === conflict.userRequirement.toLowerCase() &&
        c.severity === conflict.severity
    );
    if (!duplicate) {
      conflicts.push(conflict);
    }
  };

  for (const rawToken of ingredients) {
    const lowerToken = rawToken.toLowerCase();

    const glossaryMatch = glossaryEntries.find((entry) => {
      if (containsKeyword(lowerToken, entry.canonicalName.toLowerCase())) return true;
      if (entry.eNumber && containsKeyword(lowerToken, entry.eNumber.toLowerCase())) return true;
      return (entry.aliases || []).some((alias) => containsKeyword(lowerToken, alias.toLowerCase()));
    });

    let itemStatus = 'Compatible';
    const itemReasons = [];
    const flags = glossaryMatch ? glossaryMatch.dietaryFlags || [] : [];

    // 1. Check Allergies
    for (const allergy of input.profile.allergies) {
      const key = allergy.trim().toLowerCase();
      if (!key) continue;
      const synonyms = ALLERGY_SYNONYMS[key] || [key];
      const flagMatched = flags.some((f) => synonyms.includes(f) || f === key);
      const textMatched = synonyms.some((syn) => containsKeyword(lowerToken, syn));

      if (textMatched || flagMatched) {
        itemStatus = 'Not Recommended';
        const reason = `Contains "${rawToken}", which matches your ${allergy} allergy.`;
        itemReasons.push(reason);
        addConflict({
          ruleCategory: 'Allergy',
          severity: 'Not Recommended',
          matchedIngredient: rawToken,
          userRequirement: `${allergy} Allergy`,
          explanation: reason,
        });
      }
    }

    // 2. Check Dietary Preferences
    for (const pref of input.profile.preferences) {
      const key = pref.trim().toLowerCase();
      const rule = PREFERENCE_CONFLICT_KEYWORDS[key];
      if (!rule) continue;

      const hardFlagMatch = rule.flags.some((f) => flags.includes(f));
      const hardKeywordMatch = rule.hard.some((kw) => containsKeyword(lowerToken, kw));

      if (hardKeywordMatch || hardFlagMatch) {
        itemStatus = 'Not Recommended';
        const reason = `"${rawToken}" conflicts with your ${rule.label} dietary preference.`;
        itemReasons.push(reason);
        addConflict({
          ruleCategory: 'Dietary Preference',
          severity: 'Not Recommended',
          matchedIngredient: rawToken,
          userRequirement: rule.label,
          explanation: reason,
        });
        continue;
      }

      const cautionKeywordMatch = rule.caution.some((kw) => containsKeyword(lowerToken, kw));
      const ambiguousAnimalFlag =
        (key === 'vegetarian' || key === 'vegan' || key === 'jain vegetarian' || key === 'halal') &&
        flags.includes('ambiguous-animal-origin');

      if (cautionKeywordMatch || ambiguousAnimalFlag) {
        if (
          (key === 'vegetarian' && isCertifiedVegLabel) ||
          (key === 'vegan' && isCertifiedVeganLabel)
        ) {
          continue;
        }
        if (itemStatus === 'Compatible') itemStatus = 'Caution';
        const reason = `"${rawToken}" may have an unspecified or cross-source origin for a ${rule.label} diet.`;
        itemReasons.push(reason);
        addConflict({
          ruleCategory: 'Dietary Preference',
          severity: 'Caution',
          matchedIngredient: rawToken,
          userRequirement: rule.label,
          explanation: reason,
        });
      }
    }

    // 3. Check Food Restrictions
    for (const restriction of input.profile.restrictions) {
      const key = restriction.trim().toLowerCase();
      const rule = RESTRICTION_RULES[key];
      if (!rule) continue;

      const matched =
        rule.flags.some((f) => flags.includes(f)) ||
        rule.keywords.some((kw) => containsKeyword(lowerToken, kw));

      if (matched) {
        itemStatus = 'Not Recommended';
        const reason = `"${rawToken}" violates your "${rule.label}" restriction.`;
        itemReasons.push(reason);
        addConflict({
          ruleCategory: 'Food Restriction',
          severity: 'Not Recommended',
          matchedIngredient: rawToken,
          userRequirement: rule.label,
          explanation: reason,
        });
      }
    }

    // 4. Check Custom Avoid Keywords
    for (const customTerm of input.profile.customAvoid) {
      const term = customTerm.trim().toLowerCase();
      if (!term) continue;
      if (containsKeyword(lowerToken, term)) {
        itemStatus = 'Not Recommended';
        const reason = `"${rawToken}" matches your custom restricted ingredient "${customTerm}".`;
        itemReasons.push(reason);
        addConflict({
          ruleCategory: 'Food Restriction',
          severity: 'Not Recommended',
          matchedIngredient: rawToken,
          userRequirement: `Custom Avoid: ${customTerm}`,
          explanation: reason,
        });
      }
    }

    // 5. Glossary Default Caution
    if (itemStatus === 'Compatible' && glossaryMatch && glossaryMatch.defaultCaution) {
      itemStatus = 'Caution';
      const reason =
        glossaryMatch.cautionReason ||
        `${glossaryMatch.canonicalName} is a processed additive flagged for consumer awareness.`;
      itemReasons.push(reason);
      addConflict({
        ruleCategory: 'Trace / Ambiguity',
        severity: 'Caution',
        matchedIngredient: rawToken,
        userRequirement: 'Ingredient Awareness',
        explanation: reason,
      });
    }

    breakdown.push({
      originalName: rawToken,
      simplifiedName: glossaryMatch ? glossaryMatch.canonicalName : simplifyPlainName(rawToken),
      eNumber: glossaryMatch ? glossaryMatch.eNumber : null,
      category: glossaryMatch ? glossaryMatch.category : 'Food Ingredient',
      plainExplanation: glossaryMatch
        ? glossaryMatch.plainExplanation
        : 'Standard food component listed on the product package.',
      purpose: glossaryMatch ? glossaryMatch.purpose : 'Part of product formulation',
      status: itemStatus,
      reason: itemReasons.length > 0 ? itemReasons.join(' ') : 'No conflict with your dietary profile.',
    });
  }

  // Check Allergens Tags & Traces
  for (const allergy of input.profile.allergies) {
    const key = allergy.trim().toLowerCase();
    const synonyms = ALLERGY_SYNONYMS[key] || [key];

    if (combinedAllergensTags) {
      const directTag = synonyms.find((syn) => containsKeyword(combinedAllergensTags, syn));
      if (directTag) {
        addConflict({
          ruleCategory: 'Allergy',
          severity: 'Not Recommended',
          matchedIngredient: `Declared Allergen (${directTag})`,
          userRequirement: `${allergy} Allergy`,
          explanation: `Product allergen metadata declares "${directTag}", conflicting with your ${allergy} allergy.`,
        });
      }
    }

    if (combinedTracesText) {
      const traceMatch = synonyms.find((syn) => containsKeyword(combinedTracesText, syn));
      if (traceMatch) {
        addConflict({
          ruleCategory: 'Trace / Ambiguity',
          severity: 'Caution',
          matchedIngredient: `Possible trace: ${traceMatch}`,
          userRequirement: `${allergy} Allergy`,
          explanation: `Package advisory mentions possible cross-contamination or traces of "${traceMatch}".`,
        });
      }
    }
  }

  // Check Nutrition & Diet Plan Limits
  const nutrition = input.nutrition || {};
  const hasLowSugar = input.profile.preferences.some((p) => p.toLowerCase() === 'low-sugar');
  const hasLowSodium = input.profile.preferences.some((p) => p.toLowerCase() === 'low-sodium');

  if (typeof nutrition.sugarPer100g === 'number') {
    const limit =
      input.profile.dietPlanEnabled && input.profile.maxSugarPer100g !== null
        ? input.profile.maxSugarPer100g
        : hasLowSugar
          ? 5
          : null;

    if (limit !== null && nutrition.sugarPer100g > limit) {
      const severity =
        nutrition.sugarPer100g > limit * 2 || input.profile.dietPlanEnabled
          ? 'Not Recommended'
          : 'Caution';
      addConflict({
        ruleCategory: input.profile.dietPlanEnabled ? 'Diet Plan' : 'Nutrition',
        severity,
        matchedIngredient: `Sugar: ${nutrition.sugarPer100g}g / 100g`,
        userRequirement: input.profile.dietPlanEnabled
          ? `Diet Plan Max Sugar (${limit}g/100g)`
          : 'Low-Sugar Preference',
        explanation: `Product contains ${nutrition.sugarPer100g}g sugar per 100g, exceeding your ${limit}g/100g threshold.`,
      });
    }
  }

  if (typeof nutrition.saltPer100g === 'number' || typeof nutrition.sodiumPer100g === 'number') {
    const saltVal =
      typeof nutrition.saltPer100g === 'number'
        ? nutrition.saltPer100g
        : nutrition.sodiumPer100g * 2.5;
    const sodiumMgPer100g =
      typeof nutrition.sodiumPer100g === 'number'
        ? Math.round(nutrition.sodiumPer100g * 1000)
        : Math.round((saltVal / 2.5) * 1000);

    if (input.profile.dietPlanEnabled && input.profile.maxSodiumPer100g !== null) {
      if (sodiumMgPer100g > input.profile.maxSodiumPer100g) {
        addConflict({
          ruleCategory: 'Diet Plan',
          severity: 'Not Recommended',
          matchedIngredient: `Sodium: ${sodiumMgPer100g}mg / 100g`,
          userRequirement: `Diet Plan Max Sodium (${input.profile.maxSodiumPer100g}mg/100g)`,
          explanation: `Product sodium (${sodiumMgPer100g}mg/100g) exceeds your diet plan limit of ${input.profile.maxSodiumPer100g}mg/100g.`,
        });
      }
    } else if (hasLowSodium && saltVal > 0.6) {
      addConflict({
        ruleCategory: 'Nutrition',
        severity: saltVal > 1.5 ? 'Not Recommended' : 'Caution',
        matchedIngredient: `Salt: ${Math.round(saltVal * 100) / 100}g / 100g`,
        userRequirement: 'Low-Sodium Preference',
        explanation: `Product contains ${Math.round(saltVal * 100) / 100}g salt per 100g (${sodiumMgPer100g}mg sodium), which is elevated for a low-sodium diet.`,
      });
    }
  }

  if (
    input.profile.dietPlanEnabled &&
    input.profile.maxCaloriesPer100g !== null &&
    typeof nutrition.caloriesPer100g === 'number' &&
    nutrition.caloriesPer100g > input.profile.maxCaloriesPer100g
  ) {
    addConflict({
      ruleCategory: 'Diet Plan',
      severity: 'Caution',
      matchedIngredient: `Energy: ${nutrition.caloriesPer100g} kcal / 100g`,
      userRequirement: `Diet Plan Calorie Target (${input.profile.maxCaloriesPer100g} kcal/100g)`,
      explanation: `Calorie density (${nutrition.caloriesPer100g} kcal/100g) exceeds your diet plan target of ${input.profile.maxCaloriesPer100g} kcal/100g.`,
    });
  }

  if (ingredients.length === 0) {
    addConflict({
      ruleCategory: 'Trace / Ambiguity',
      severity: 'Caution',
      matchedIngredient: 'Missing ingredient list',
      userRequirement: 'Verification Required',
      explanation: 'No full ingredient list was available for this product. Please scan the ingredient label directly to verify compatibility.',
    });
  }

  const hasNotRecommended = conflicts.some((c) => c.severity === 'Not Recommended');
  const hasCaution = conflicts.some((c) => c.severity === 'Caution');

  let verdict = 'Compatible';
  let summaryReason = 'No conflicts were detected against your allergies, dietary preferences, or restrictions.';

  if (hasNotRecommended) {
    verdict = 'Not Recommended';
    const hardCount = conflicts.filter((c) => c.severity === 'Not Recommended').length;
    const first = conflicts.find((c) => c.severity === 'Not Recommended');
    summaryReason = `${hardCount} critical dietary conflict${hardCount > 1 ? 's' : ''} detected (${first.userRequirement}: ${first.matchedIngredient}).`;
  } else if (hasCaution) {
    verdict = 'Caution';
    const cautionCount = conflicts.length;
    summaryReason = `${cautionCount} item${cautionCount > 1 ? 's require' : ' requires'} your attention (${conflicts[0].matchedIngredient}).`;
  }

  return {
    verdict,
    summaryReason,
    conflicts,
    ingredientsBreakdown: breakdown,
    parsedCount: breakdown.length,
    disclaimer:
      'FoodLens provides informational ingredient analysis based on available product data and your saved profile. It is not a medical diagnosis; always verify physical packaging for severe allergies.',
  };
}
