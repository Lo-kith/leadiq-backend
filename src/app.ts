import express, { type Express } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { AppError } from './middleware/errors.js';

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const isDev = env.nodeEnv !== 'production';
        const allowed =
          env.frontendOrigins.includes(origin) ||
          (isDev && /^http:\/\/localhost:\d+$/.test(origin)) ||
          (isDev && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin));
        if (allowed) return callback(null, true);
        return callback(AppError.badRequest(`CORS blocked for origin ${origin}`));
      },
      credentials: true,
    }),
  );

  app.get('/', (_req, res) => {
    res.json({ name: 'LeadIQ API', version: '1.0.0', docs: '/api/health' });
  });

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
