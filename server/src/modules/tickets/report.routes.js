import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';

const reportSchema = z.object({
  categoryCode: z.string().trim().min(1).max(40),
  description: z.string().trim().min(1).max(300),
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180)
});

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function invalidReportError() {
  return new ApiError(400, 'INVALID_REPORT', 'Choose a category, add a description, and select a valid location.');
}

export function createReportRouter({ createReport, rateLimit, upload }) {
  const router = Router();

  router.post('/reports', rateLimit, upload, asyncHandler(async (request, response) => {
    const parsed = reportSchema.safeParse(request.body);

    if (!parsed.success) {
      throw invalidReportError();
    }

    if (!request.file) {
      throw new ApiError(400, 'PHOTO_REQUIRED', 'Add one photo before submitting your report.');
    }

    const report = await createReport({ ...parsed.data, file: request.file });
    response.status(201).json(report);
  }));

  return router;
}
