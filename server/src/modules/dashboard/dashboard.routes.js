import { Router } from 'express';
import { findByCategory, findByWard, findSummary } from './dashboard.queries.js';

const percentDecimals = 10;

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

  return router;
}
