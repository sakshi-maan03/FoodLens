
// Central configuration for FoodLens MERN backend

export const PORT = Number(process.env.PORT) || 3000;

export const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/foodlens';

export const LOCAL_MONGO_STORAGE_PATH = './data/mongodb';

// Open Food Facts APIs
export const OPEN_FOOD_FACTS_PRIMARY_URL =
  'https://world.openfoodfacts.org/api/v2/product';

export const OPEN_FOOD_FACTS_FALLBACK_URL =
  'https://world.openfoodfacts.net/api/v2/product';

export const OPEN_FOOD_FACTS_US_URL =
  'https://us.openfoodfacts.org/api/v2/product';

export const OPEN_PRODUCTS_FACTS_URL =
  'https://world.openproductsfacts.org/api/v2/product';

export const OPEN_BEAUTY_FACTS_URL =
  'https://world.openbeautyfacts.org/api/v2/product';

export const OPEN_PET_FOOD_FACTS_URL =
  'https://world.openpetfoodfacts.org/api/v2/product';

// USDA API
export const USDA_FDC_SEARCH_URL =
  'https://api.nal.usda.gov/fdc/v1/foods/search';

export const USDA_FDC_API_KEY =
  process.env.USDA_FDC_API_KEY || 'DEMO_KEY';

// UPC Item DB
export const UPC_ITEM_DB_LOOKUP_URL =
  'https://api.upcitemdb.com/prod/trial/lookup';

// JWT configuration
export const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? undefined
    : 'foodlens_mern_jwt_secret_key');

if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production.');
}


