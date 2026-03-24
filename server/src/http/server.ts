import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

import authRoutes from './routes/auth-routes';
import userRoutes from './routes/user-routes';
import workoutRoutes from './routes/workout-routes';
import adminRoutes from './routes/admin-routes';
import graphicsRoutes from './routes/graphics-routes';

const log = createLogger('http');

export function createApp(): express.Application {
  const app = express();

  app.disable('x-powered-by');

  // CORS — restrict origins; set CORS_ORIGIN env to allow specific origins
  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(cors({
    origin: corsOrigin ? corsOrigin.split(',').map(s => s.trim()) : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-MAC'],
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.ENABLE_HSTS === 'true') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    log.debug(`${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  });

  // Public feature flags endpoint (no auth — returns only visible flags for client UI)
  app.get('/api/features', (_req: Request, res: Response) => {
    try {
      const featureFlagService = require('../admin/feature-flag-service');
      const flags = featureFlagService.listFlags() as Array<{ featureKey: string; isEnabled: boolean; isVisible: boolean }>;
      const publicFlags: Record<string, boolean> = {};
      for (const f of flags) {
        if (f.isVisible) {
          publicFlags[f.featureKey] = f.isEnabled;
        }
      }
      res.json({ success: true, data: publicFlags });
    } catch {
      res.json({ success: true, data: {} });
    }
  });

  // Public branding endpoint (no auth, used by clients for splash/branding display)
  app.get('/api/branding', (_req: Request, res: Response) => {
    try {
      const brandingService = require('../admin/branding-service');
      res.json({ success: true, data: brandingService.getBranding() });
    } catch {
      res.json({ success: true, data: null });
    }
  });

  // Public logo endpoint (no auth, for displaying logos in the client UI)
  app.get('/api/logos/:type', (req: Request, res: Response) => {
    try {
      const brandingService = require('../admin/branding-service');
      const type = req.params.type as 'primary' | 'secondary' | 'favicon' | 'splash';
      const { data, mimeType } = brandingService.getLogo(type);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(data);
    } catch {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Logo not found' } });
    }
  });

  // Public i18n endpoints (no auth — clients fetch languages and translations)
  app.get('/api/i18n/config', (_req: Request, res: Response) => {
    try {
      const i18nService = require('../admin/i18n-service');
      res.json({
        success: true,
        data: {
          defaultLocale: i18nService.getDefaultLocale(),
          autoDetect: i18nService.isAutoLocaleEnabled(),
        },
      });
    } catch {
      res.json({ success: true, data: { defaultLocale: 'en', autoDetect: false } });
    }
  });

  app.get('/api/i18n/languages', (_req: Request, res: Response) => {
    try {
      const i18nService = require('../admin/i18n-service');
      res.json({ success: true, data: i18nService.listLanguages() });
    } catch {
      res.json({ success: true, data: [] });
    }
  });

  app.get('/api/i18n/:locale', (req: Request, res: Response) => {
    try {
      const i18nService = require('../admin/i18n-service');
      const translations = i18nService.getTranslations(req.params.locale);
      if (!translations) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Language pack not found' } });
      }
      res.json({ success: true, data: translations });
    } catch {
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load translations' } });
    }
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/workouts', workoutRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/graphics', graphicsRoutes);

  // Serve static frontend files
  const publicPath = path.resolve(__dirname, '../../public');
  app.use(express.static(publicPath));

  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API endpoint not found' } });
    }
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
      if (err) next(err);
    });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
    } else {
      log.error('Unhandled error', { message: err.message, stack: err.stack });
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Internal server error' },
      });
    }
  });

  return app;
}
