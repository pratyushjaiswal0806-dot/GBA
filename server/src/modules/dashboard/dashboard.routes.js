import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';
import { findByCategory, findByWard, findMapPoints, findSummary, findTrend } from './dashboard.queries.js';

const percentDecimals = 10;
const trendQuerySchema = z.object({
  interval: z.enum(['week', 'month']).default('week')
});

function parseTrendQuery(query) {
  const parsed = trendQuerySchema.safeParse(query);

  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_INTERVAL', 'Choose interval=week or interval=month.');
  }

  return parsed.data;
}

function resolutionRate({ total, resolved }) {
  return total === 0 ? 0 : Math.round((resolved / total) * 100 * percentDecimals) / percentDecimals;
}

export function createDashboardRouter({ db }) {
  const router = Router();

  router.get('/dashboard/summary', async (request, response, next) => {
    try {
      const summary = await findSummary(db);
      response.json({ ...summary, resolutionRate: resolutionRate(summary) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard/by-ward', async (request, response, next) => {
    try {
      response.json({ wards: await findByWard(db) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard/by-category', async (request, response, next) => {
    try {
      response.json({ categories: await findByCategory(db) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard/map', async (request, response, next) => {
    try {
      response.json({ points: await findMapPoints(db) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard/trend', async (request, response, next) => {
    try {
      const { interval } = parseTrendQuery(request.query);
      response.json({ interval, points: await findTrend(db, interval) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
