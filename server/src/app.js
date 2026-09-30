import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorHandler } from './middleware/errorHandler.js';
import { createLocationRateLimit } from './middleware/rateLimit.js';
import { createDashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { createGeoRouter } from './modules/geo/geo.routes.js';
import { ApiError } from './utils/ApiError.js';

const defaultFrontendDist = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

const unavailableGeocoder = { reverse: async () => null };

function createCorsMiddleware(allowedOrigins = []) {
  const origins = new Set(allowedOrigins);

  return (request, response, next) => {
    const requestOrigin = request.headers.origin;

    if (!requestOrigin || !origins.has(requestOrigin)) {
      next();
      return;
    }

    response.setHeader('Access-Control-Allow-Origin', requestOrigin);
    response.setHeader('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.vary('Origin');

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  };
}

export function createApp({
  db,
  geocoder = unavailableGeocoder,
  reportRouter,
  authRouter,
  officerRouter,
  ticketRouter,
  verifierRouter,
  duplicateRouter,
  frontendDist = defaultFrontendDist,
  allowedOrigins = [],
  serveFrontend = true
}) {
  if (
    !db
    || typeof db.checkConnection !== 'function'
    || typeof db.query !== 'function'
  ) {
    throw new Error('createApp requires a database adapter with checkConnection() and query().');
  }

  const app = express();

  app.disable('x-powered-by');
  if (process.env.VERCEL === '1') {
    app.set('trust proxy', 1);
  }
  app.use(helmet());
  app.use(createCorsMiddleware(allowedOrigins));
  app.use(express.json());

  app.get('/api/health', asyncHandler(async (request, response) => {
    let database = 'down';

    try {
      await db.checkConnection();
      database = 'ok';
    } catch {
      // The endpoint remains reachable so the frontend can show the database state.
    }

    response.json({ server: 'ok', database });
  }));

  app.get('/api/categories', asyncHandler(async (request, response) => {
    const result = await db.query(
      `SELECT code, name
       FROM categories
       WHERE reportable = TRUE
       ORDER BY id`
    );

    response.json({ categories: result.rows });
  }));

  app.use('/api', createDashboardRouter({ db }));

  app.use('/api', createGeoRouter({
    db,
    geocoder,
    rateLimit: createLocationRateLimit()
  }));

  if (reportRouter) {
    app.use('/api', reportRouter);
  }

  if (authRouter) {
    app.use('/api', authRouter);
  }

  if (officerRouter) {
    app.use('/api', officerRouter);
  }

  if (duplicateRouter) {
    app.use('/api', duplicateRouter);
  }

  if (ticketRouter) {
    app.use('/api', ticketRouter);
  }

  if (verifierRouter) {
    app.use('/api', verifierRouter);
  }

  app.use('/api', (request, response, next) => {
    next(new ApiError(404, 'NOT_FOUND', 'Route not found.'));
  });

  if (serveFrontend) {
    app.use(express.static(frontendDist));

    app.get('*', (request, response, next) => {
      const indexPath = path.join(frontendDist, 'index.html');

      if (!request.path.startsWith('/api') && existsSync(indexPath)) {
        response.sendFile(indexPath);
        return;
      }

      next(new ApiError(404, 'NOT_FOUND', 'Page not found.'));
    });
  } else {
    app.get('*', (request, response, next) => {
      next(new ApiError(404, 'NOT_FOUND', 'Route not found.'));
    });
  }

  app.use(errorHandler);

  return app;
}
