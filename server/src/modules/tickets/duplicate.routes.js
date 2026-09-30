import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';

const coordinate = (limit) => z.string().trim().min(1).pipe(z.coerce.number().finite().min(-limit).max(limit));
const nearbySchema = z.object({
  lat: coordinate(90),
  lng: coordinate(180),
  category: z.string().trim().min(1).max(40)
});
const publicCodeSchema = z.string().trim().min(1).max(200);

function parseNearbyQuery(query) {
  const parsed = nearbySchema.safeParse(query);

  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_NEARBY_QUERY', 'Give a valid location and a category.');
  }

  return { lat: parsed.data.lat, lng: parsed.data.lng, categoryCode: parsed.data.category };
}

function parsePublicCode(value) {
  const parsed = publicCodeSchema.safeParse(value);

  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_PUBLIC_CODE', 'Enter a ticket code.');
  }

  return parsed.data;
}

export function createDuplicateRouter({ duplicateService, nearbyRateLimit, supportRateLimit }) {
  const router = Router();

  router.get('/reports/nearby', nearbyRateLimit, async (request, response, next) => {
    try {
      response.json(await duplicateService.findNearby(parseNearbyQuery(request.query)));
    } catch (error) {
      next(error);
    }
  });

  router.post('/reports/:publicCode/support', supportRateLimit, async (request, response, next) => {
    try {
      response.json(await duplicateService.addSupport(parsePublicCode(request.params.publicCode)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
