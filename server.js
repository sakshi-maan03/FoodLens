import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { PORT } from './server/config/config.js';
import { connectDatabase, disconnectDatabase } from './server/config/db.js';
import { adminRoutes } from './server/routes/adminRoutes.js';
import { authRoutes } from './server/routes/authRoutes.js';
import { glossaryRoutes } from './server/routes/glossaryRoutes.js';
import { historyRoutes } from './server/routes/historyRoutes.js';
import { ocrRoutes } from './server/routes/ocrRoutes.js';
import { productRoutes } from './server/routes/productRoutes.js';
import { profileRoutes } from './server/routes/profileRoutes.js';

async function startServer() {
  await connectDatabase();

  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'FoodLens MERN API' });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/ocr', ocrRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api/glossary', glossaryRoutes);
  app.use('/api/admin', adminRoutes);

  // API 404 handler (prevent falling through to SPA HTML fallback)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // API error handler
  app.use('/api', (err, _req, res, _next) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = typeof err?.status === 'number' ? err.status : 400;
    res.status(status).json({ error: message });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build artifacts not found. Run npm run build first.');
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`FoodLens MERN server listening on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start FoodLens MERN server:', err);
  process.exit(1);
});
