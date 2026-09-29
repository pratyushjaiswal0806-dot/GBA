import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';
import { findWardByPoint } from '../wards/ward.service.js';

const locationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180)
});

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function invalidLocationError() {
  return new ApiError(400, 'INVALID_LOCATION', 'lat and lng must be valid geographic coordinates.');
}

export function createGeoRouter({ db, geocoder, rateLimit }) {
  const router = Router();

  router.post('/locations/resolve', rateLimit, asyncHandler(async (request, response) => {
    const parsed = locationSchema.safeParse(request.body);

    if (!parsed.success) {
      throw invalidLocationError();
    }

    const ward = await findWardByPoint(db, parsed.data);

    if (!ward) {
      response.json({ ward: null, street: null, area: null, inPilotArea: false });
      return;
    }

    const address = await geocoder.reverse(parsed.data);
    response.json({
      ward,
      street: address?.street ?? null,
      area: address?.area ?? null,
      inPilotArea: true
    });
  }));

  return router;
}
