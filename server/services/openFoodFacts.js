import {
  OPEN_BEAUTY_FACTS_URL,
  OPEN_FOOD_FACTS_FALLBACK_URL,
  OPEN_FOOD_FACTS_PRIMARY_URL,
  OPEN_FOOD_FACTS_US_URL,
  OPEN_PET_FOOD_FACTS_URL,
  OPEN_PRODUCTS_FACTS_URL,
  UPC_ITEM_DB_LOOKUP_URL,
  USDA_FDC_API_KEY,
  USDA_FDC_SEARCH_URL,
} from '../config/config.js';

function cleanOffTag(tag) {
  return tag.replace(/^[a-z]{2}:/i, '').replace(/-/g, ' ').trim();
}

function toNumberOrNull(val) {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.round(val * 100) / 100;
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
  }
  return null;
}

export function computeGs1CheckDigit(bodyDigits) {
  let sum = 0;
  for (let i = bodyDigits.length - 1, pos = 1; i >= 0; i--, pos++) {
    const digit = Number(bodyDigits[i]);
    if (!Number.isInteger(digit)) return null;
    sum += digit * (pos % 2 === 1 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}

export function isValidGs1Code(digits) {
  if (!/^\d+$/.test(digits)) return false;
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const expected = computeGs1CheckDigit(digits.slice(0, -1));
  return expected !== null && expected === digits[digits.length - 1];
}

export function expandUpcEToUpcA(upcE) {
  if (!/^[01]\d{7}$/.test(upcE)) return null;
  const numberSystem = upcE[0];
  const d1 = upcE[1];
  const d2 = upcE[2];
  const d3 = upcE[3];
  const d4 = upcE[4];
  const d5 = upcE[5];
  const d6 = upcE[6];
  const check = upcE[7];

  let body11 = '';
  if (d6 === '0' || d6 === '1' || d6 === '2') {
    body11 = `${numberSystem}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  } else if (d6 === '3') {
    body11 = `${numberSystem}${d1}${d2}${d3}00000${d4}${d5}`;
  } else if (d6 === '4') {
    body11 = `${numberSystem}${d1}${d2}${d3}${d4}00000${d5}`;
  } else {
    body11 = `${numberSystem}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  }

  const computedCheck = computeGs1CheckDigit(body11);
  if (computedCheck !== check) return null;
  return `${body11}${check}`;
}

export function buildBarcodeLookupCandidates(rawBarcode) {
  const sanitized = String(rawBarcode || '').replace(/[^0-9A-Za-z]/g, '');
  if (!sanitized || sanitized.length < 6) {
    throw new Error('Invalid barcode format. Please enter at least 6 digits.');
  }

  const candidates = [];
  const addCandidate = (code) => {
    if (code && !candidates.includes(code)) {
      candidates.push(code);
    }
  };

  addCandidate(sanitized);

  if (/^\d+$/.test(sanitized)) {
    // 11 digits: handle omitted leading zero on a 12-digit UPC-A
    if (sanitized.length === 11) {
      const padded12 = `0${sanitized}`;
      if (isValidGs1Code(padded12)) {
        addCandidate(padded12);
        addCandidate(`00${sanitized}`);
      }
    }

    // 12-digit UPC-A <-> 13-digit EAN-13 (leading zero)
    if (sanitized.length === 12) {
      addCandidate(`0${sanitized}`);
    }

    // 13-digit EAN-13 starting with 0 <-> 12-digit UPC-A
    if (sanitized.length === 13 && sanitized.startsWith('0')) {
      addCandidate(sanitized.slice(1));
    }

    // 14-digit GTIN-14 starting with 0 <-> EAN-13 / UPC-A
    if (sanitized.length === 14 && sanitized.startsWith('0')) {
      const ean13 = sanitized.slice(1);
      addCandidate(ean13);
      if (ean13.startsWith('0')) {
        addCandidate(ean13.slice(1));
      }
    }

    // 8-digit code: could be EAN-8 or UPC-E
    if (sanitized.length === 8) {
      const expandedUpcA = expandUpcEToUpcA(sanitized);
      if (expandedUpcA) {
        addCandidate(expandedUpcA);
        addCandidate(`0${expandedUpcA}`);
      }
      addCandidate(`00000${sanitized}`);
    }

    // 7-digit code: EAN-8 missing leading zero
    if (sanitized.length === 7) {
      const padded8 = `0${sanitized}`;
      if (isValidGs1Code(padded8)) {
        addCandidate(padded8);
        addCandidate(`00000${padded8}`);
      }
    }
  }

  // Canonical GS1 equivalence set (stripped of leading zeros for strict verification across third-party APIs)
  const gs1StrippedSet = new Set(
    candidates.map((c) => (/^\d+$/.test(c) ? c.replace(/^0+/, '') || '0' : c.toUpperCase()))
  );

  return {
    sanitized,
    candidates,
    gs1StrippedSet,
  };
}

function codesAreGs1Equivalent(candidateCode, gs1StrippedSet) {
  const digits = String(candidateCode || '').replace(/[^0-9A-Za-z]/g, '');
  if (!digits) return false;
  const normalized = /^\d+$/.test(digits) ? digits.replace(/^0+/, '') || '0' : digits.toUpperCase();
  return gs1StrippedSet.has(normalized);
}

function mapOpenFoodFactsProduct(json, fallbackBarcode, sourceApi = 'openfoodfacts') {
  const p = json.product;
  const nutriments = p.nutriments || {};
  const resolvedCode =
    (typeof json.code === 'string' && json.code.trim()) ||
    (typeof p.code === 'string' && p.code.trim()) ||
    fallbackBarcode;

  const ingredientsText =
    (typeof p.ingredients_text_en === 'string' && p.ingredients_text_en.trim()) ||
    (typeof p.ingredients_text === 'string' && p.ingredients_text.trim()) ||
    '';

  const productName =
    (typeof p.product_name_en === 'string' && p.product_name_en.trim()) ||
    (typeof p.product_name === 'string' && p.product_name.trim()) ||
    (typeof p.generic_name === 'string' && p.generic_name.trim()) ||
    '';

  if (!productName && !ingredientsText && !p.brands && !p.image_front_url && !p.image_url) {
    return null;
  }

  const brand = typeof p.brands === 'string' ? p.brands.trim() : '';
  const quantity = typeof p.quantity === 'string' ? p.quantity.trim() : '';
  const imageUrl =
    (typeof p.image_front_url === 'string' && p.image_front_url) ||
    (typeof p.image_url === 'string' && p.image_url) ||
    null;

  const categoriesRaw = typeof p.categories === 'string' ? p.categories : '';
  const categories = categoriesRaw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 6);

  const allergensTags = Array.isArray(p.allergens_tags)
    ? p.allergens_tags.map(cleanOffTag)
    : [];
  const tracesTags = Array.isArray(p.traces_tags) ? p.traces_tags.map(cleanOffTag) : [];
  const additivesTags = Array.isArray(p.additives_tags)
    ? p.additives_tags.map(cleanOffTag)
    : [];
  const labelsTags = Array.isArray(p.labels_tags) ? p.labels_tags.map(cleanOffTag) : [];

  const saltPer100g = toNumberOrNull(nutriments.salt_100g);
  let sodiumPer100g = toNumberOrNull(nutriments.sodium_100g);
  if (sodiumPer100g === null && saltPer100g !== null) {
    sodiumPer100g = Math.round((saltPer100g / 2.5) * 100) / 100;
  }

  return {
    barcode: resolvedCode,
    productName: productName || `Product ${resolvedCode}`,
    brand,
    quantity,
    imageUrl,
    categories,
    ingredientsText,
    allergensTags,
    tracesTags,
    additivesTags,
    labelsTags,
    nutriscoreGrade:
      typeof p.nutriscore_grade === 'string' ? p.nutriscore_grade.toUpperCase() : null,
    novaGroup: typeof p.nova_group === 'number' ? p.nova_group : null,
    nutrition: {
      caloriesPer100g: toNumberOrNull(nutriments['energy-kcal_100g']),
      sugarPer100g: toNumberOrNull(nutriments.sugars_100g),
      saltPer100g,
      sodiumPer100g,
      fatPer100g: toNumberOrNull(nutriments.fat_100g),
      saturatedFatPer100g: toNumberOrNull(nutriments['saturated-fat_100g']),
      carbsPer100g: toNumberOrNull(nutriments.carbohydrates_100g),
      proteinPer100g: toNumberOrNull(nutriments.proteins_100g),
    },
    sourceApi,
  };
}

async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FoodLens/1.0 (Academic Dietary Analysis Project)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function queryOpenFactsFamilyEndpoint(baseUrl, code, sourceApi) {
  const url = `${baseUrl}/${encodeURIComponent(code)}.json`;
  const response = await fetchJsonWithTimeout(url, 8000);

  if (response.status === 404) {
    return { reachable: true, product: null };
  }

  if (!response.ok) {
    return {
      reachable: false,
      product: null,
      error: new Error(`External food API responded with status ${response.status}`),
    };
  }

  const json = await response.json().catch(() => null);
  if (!json || json.status === 0 || !json.product) {
    return { reachable: true, product: null };
  }

  const mapped = mapOpenFoodFactsProduct(json, code, sourceApi);
  return { reachable: true, product: mapped };
}

function extractUsdaNutrient(foodNutrients, matchIds, matchNames) {
  if (!Array.isArray(foodNutrients)) return null;
  const found = foodNutrients.find(
    (n) =>
      matchIds.includes(n.nutrientId) ||
      matchIds.includes(Number(n.nutrientNumber)) ||
      (typeof n.nutrientName === 'string' &&
        matchNames.some((kw) => n.nutrientName.toLowerCase().includes(kw)))
  );
  if (!found || typeof found.value !== 'number') return null;

  // Convert mg sodium to grams per 100g if needed
  if (
    typeof found.unitName === 'string' &&
    found.unitName.toLowerCase() === 'mg' &&
    matchNames.includes('sodium')
  ) {
    return Math.round((found.value / 1000) * 1000) / 1000;
  }
  return toNumberOrNull(found.value);
}

async function queryUsdaFoodDataCentral(candidates, gs1StrippedSet) {
  for (const code of candidates.slice(0, 2)) {
    try {
      const url = `${USDA_FDC_SEARCH_URL}?api_key=${encodeURIComponent(USDA_FDC_API_KEY)}&query=${encodeURIComponent(code)}&dataType=Branded&pageSize=5`;
      const response = await fetchJsonWithTimeout(url, 6500);
      if (!response.ok) continue;

      const json = await response.json().catch(() => null);
      const foods = Array.isArray(json?.foods) ? json.foods : [];
      const exactMatch = foods.find(
        (food) => food?.gtinUpc && codesAreGs1Equivalent(food.gtinUpc, gs1StrippedSet)
      );
      if (!exactMatch) continue;

      const nutrients = exactMatch.foodNutrients || [];
      const sodiumPer100g = extractUsdaNutrient(nutrients, [1093, 307], ['sodium']);
      const saltPer100g =
        sodiumPer100g !== null ? Math.round(sodiumPer100g * 2.5 * 100) / 100 : null;

      return {
        barcode: String(exactMatch.gtinUpc || code).replace(/\D/g, '') || code,
        productName: exactMatch.description || `Product ${code}`,
        brand: exactMatch.brandName || exactMatch.brandOwner || '',
        quantity:
          exactMatch.servingSize && exactMatch.servingSizeUnit
            ? `Serving: ${exactMatch.servingSize}${exactMatch.servingSizeUnit}`
            : '',
        imageUrl: null,
        categories: exactMatch.foodCategory ? [exactMatch.foodCategory] : [],
        ingredientsText:
          typeof exactMatch.ingredients === 'string' ? exactMatch.ingredients.trim() : '',
        allergensTags: [],
        tracesTags: [],
        additivesTags: [],
        labelsTags: [],
        nutriscoreGrade: null,
        novaGroup: null,
        nutrition: {
          caloriesPer100g: extractUsdaNutrient(nutrients, [1008, 208], ['energy']),
          sugarPer100g: extractUsdaNutrient(nutrients, [2000, 269], ['sugars, total']),
          saltPer100g,
          sodiumPer100g,
          fatPer100g: extractUsdaNutrient(nutrients, [1004, 204], ['total lipid']),
          saturatedFatPer100g: extractUsdaNutrient(nutrients, [1258, 606], ['fatty acids, total saturated']),
          carbsPer100g: extractUsdaNutrient(nutrients, [1005, 205], ['carbohydrate']),
          proteinPer100g: extractUsdaNutrient(nutrients, [1003, 203], ['protein']),
        },
        sourceApi: 'usda_fdc',
      };
    } catch {
      // Non-fatal fallback error
    }
  }
  return null;
}

async function queryUpcItemDb(candidates, gs1StrippedSet) {
  for (const code of candidates.slice(0, 2)) {
    try {
      const url = `${UPC_ITEM_DB_LOOKUP_URL}?upc=${encodeURIComponent(code)}`;
      const response = await fetchJsonWithTimeout(url, 6500);
      if (!response.ok) continue;

      const json = await response.json().catch(() => null);
      const items = Array.isArray(json?.items) ? json.items : [];
      const exactMatch = items.find(
        (item) =>
          (item?.ean && codesAreGs1Equivalent(item.ean, gs1StrippedSet)) ||
          (item?.upc && codesAreGs1Equivalent(item.upc, gs1StrippedSet))
      );
      if (!exactMatch || !exactMatch.title) continue;

      return {
        barcode: exactMatch.ean || exactMatch.upc || code,
        productName: exactMatch.title,
        brand: exactMatch.brand || '',
        quantity: exactMatch.size || exactMatch.weight || '',
        imageUrl: Array.isArray(exactMatch.images) && exactMatch.images[0] ? exactMatch.images[0] : null,
        categories: exactMatch.category ? [exactMatch.category] : [],
        ingredientsText:
          typeof exactMatch.ingredients === 'string' ? exactMatch.ingredients.trim() : '',
        allergensTags: [],
        tracesTags: [],
        additivesTags: [],
        labelsTags: [],
        nutriscoreGrade: null,
        novaGroup: null,
        nutrition: {},
        sourceApi: 'upcitemdb',
      };
    } catch {
      // Non-fatal fallback error
    }
  }
  return null;
}

export async function fetchProductWithSources(barcode) {
  const { sanitized, candidates, gs1StrippedSet } = buildBarcodeLookupCandidates(barcode);
  const checkedSources = [];
  let anyReachable = false;
  let lastError = null;

  // Tier 1: Open Food Facts primary endpoint across all GS1-equivalent barcode formats
  checkedSources.push('Open Food Facts');
  for (const code of candidates) {
    try {
      const res = await queryOpenFactsFamilyEndpoint(
        OPEN_FOOD_FACTS_PRIMARY_URL,
        code,
        'openfoodfacts'
      );
      if (res.reachable) anyReachable = true;
      if (res.error) lastError = res.error;
      if (res.product) {
        return { product: res.product, sanitized, candidates, checkedSources };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Failed to reach Open Food Facts');
    }
  }

  // Tier 2: Open Food Facts mirrors (US + .net fallback)
  for (const [label, baseUrl, sourceKey] of [
    ['Open Food Facts US', OPEN_FOOD_FACTS_US_URL, 'openfoodfacts_us'],
    ['Open Food Facts Mirror', OPEN_FOOD_FACTS_FALLBACK_URL, 'openfoodfacts_mirror'],
  ]) {
    checkedSources.push(label);
    for (const code of candidates.slice(0, 2)) {
      try {
        const res = await queryOpenFactsFamilyEndpoint(baseUrl, code, sourceKey);
        if (res.reachable) anyReachable = true;
        if (res.error) lastError = res.error;
        if (res.product) {
          return { product: res.product, sanitized, candidates, checkedSources };
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(`Failed to reach ${label}`);
      }
    }
  }

  // Tier 3: Sibling Open*Facts databases (Products, Beauty, Pet Food)
  for (const [label, baseUrl, sourceKey] of [
    ['Open Products Facts', OPEN_PRODUCTS_FACTS_URL, 'openproductsfacts'],
    ['Open Beauty Facts', OPEN_BEAUTY_FACTS_URL, 'openbeautyfacts'],
    ['Open Pet Food Facts', OPEN_PET_FOOD_FACTS_URL, 'openpetfoodfacts'],
  ]) {
    checkedSources.push(label);
    for (const code of candidates.slice(0, 2)) {
      try {
        const res = await queryOpenFactsFamilyEndpoint(baseUrl, code, sourceKey);
        if (res.reachable) anyReachable = true;
        if (res.product) {
          return { product: res.product, sanitized, candidates, checkedSources };
        }
      } catch {
        // Non-fatal sibling database error
      }
    }
  }

  // Tier 4: USDA FoodData Central (strict GTIN/UPC verification)
  checkedSources.push('USDA FoodData Central');
  const usdaProduct = await queryUsdaFoodDataCentral(candidates, gs1StrippedSet);
  if (usdaProduct) {
    return { product: usdaProduct, sanitized, candidates, checkedSources };
  }

  // Tier 5: UPCitemdb (strict EAN/UPC verification)
  checkedSources.push('UPCitemdb');
  const upcDbProduct = await queryUpcItemDb(candidates, gs1StrippedSet);
  if (upcDbProduct) {
    return { product: upcDbProduct, sanitized, candidates, checkedSources };
  }

  if (!anyReachable && lastError) {
    throw lastError;
  }

  return { product: null, sanitized, candidates, checkedSources };
}

export async function fetchProductByBarcode(barcode) {
  const result = await fetchProductWithSources(barcode);
  return result.product;
}
