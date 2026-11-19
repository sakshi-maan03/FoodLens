import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { extractIngredientsFromImage } from '../services/ocrService.js';

export const ocrRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files (JPEG, PNG, WebP) are supported for label scanning.'));
      return;
    }
    cb(null, true);
  },
});

ocrRoutes.post('/extract', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Please upload or capture an image of the ingredient label.' });
      return;
    }

    const result = await extractIngredientsFromImage(req.file.buffer, req.file.mimetype);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to extract ingredients from image.';
    res.status(500).json({ error: message });
  }
});
