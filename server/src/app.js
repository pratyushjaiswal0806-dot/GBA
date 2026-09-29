import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorHandler } from './middleware/errorHandler.js';
import { createLocationRateLimit } from './middleware/rateLimit.js';
import { createGeoRouter } from './modules/geo/geo.routes.js';
import { ApiError } from './utils/ApiError.js';

const defaultFrontendDist = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

const unavailableGeocoder = { reverse: async () => null };

export function createApp({ db, geocoder = unavailableGeocoder, frontendDist = defaultFrontendDist }) {
  if (
    !db
    || typeof db.checkConnection !== 'function'
    || typeof db.query !== 'function'
  ) {
    throw new Error('createApp requires a database adapter with checkConnection() and query().');
  }

  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
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

  app.use('/api', createGeoRouter({
    db,
    geocoder,
    rateLimit: createLocationRateLimit()
  }));

  app.use('/api', (request, response, next) => {
    next(new ApiError(404, 'NOT_FOUND', 'Route not found.'));
  });

  app.use(express.static(frontendDist));

  app.get('*', (request, response, next) => {
    const indexPath = path.join(frontendDist, 'index.html');

    if (!request.path.startsWith('/api') && existsSync(indexPath)) {
      response.sendFile(indexPath);
      return;
    }

    next(new ApiError(404, 'NOT_FOUND', 'Page not found.'));
  });

  app.use(errorHandler);

  return app;
}
