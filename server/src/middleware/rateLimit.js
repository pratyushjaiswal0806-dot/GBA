import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

const LOCATION_WINDOW_MS = 60_000;
const LOCATION_MAX_REQUESTS = 60;
const hourInMilliseconds = 60 * 60 * 1_000;

export function createLocationRateLimit() {
  return rateLimit({
    windowMs: LOCATION_WINDOW_MS,
    limit: LOCATION_MAX_REQUESTS,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (request, response, next) => {
      next(new ApiError(429, 'RATE_LIMITED', 'Too many location requests. Try again shortly.'));
    }
  });
}

export function createReportRateLimit({ maxRequests }) {
  return rateLimit({
    windowMs: hourInMilliseconds,
    limit: maxRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (request, response, next) => {
      next(new ApiError(429, 'RATE_LIMITED', 'Too many reports. Try again later.'));
    }
  });
}
