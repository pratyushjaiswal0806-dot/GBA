import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';

const ticketIdSchema = z.coerce.number().int().positive();
export const remarksMaxLength = 500;

const actionReportSchema = z.object({
  remarks: z.string().trim().min(1).max(remarksMaxLength),
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180)
});
const publicCodeSchema = z.string().trim().min(1).max(200);

function invalidTicketIdError() {
  return new ApiError(400, 'INVALID_TICKET_ID', 'Ticket id must be a positive integer.');
}

function invalidPublicCodeError() {
  return new ApiError(400, 'INVALID_PUBLIC_CODE', 'Enter a ticket code.');
}

function parseTicketId(value) {
  const parsed = ticketIdSchema.safeParse(value);
  if (!parsed.success) throw invalidTicketIdError();
  return parsed.data;
}

function parseActionReport(body, files) {
  const parsed = actionReportSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_ACTION_REPORT', `Add remarks (up to ${remarksMaxLength} characters) and a valid location.`);
  }

  if (!files?.length) {
    throw new ApiError(400, 'PHOTO_REQUIRED', 'Add at least one action photo.');
  }

  return parsed.data;
}

function parsePublicCode(value) {
  const parsed = publicCodeSchema.safeParse(value);
  if (!parsed.success) throw invalidPublicCodeError();
  return parsed.data;
}

export function createTicketRouter({
  requireAuth,
  requireOfficer,
  ticketService,
  actionReportService,
  photosUpload
}) {
  const router = Router();

  router.get('/tickets/:id', requireAuth, async (request, response, next) => {
    try {
      const ticket = await ticketService.getStaffDetail({
        ticketId: parseTicketId(request.params.id),
        user: request.user
      });
      response.json(ticket);
    } catch (error) {
      next(error);
    }
  });

  router.post('/tickets/:id/start', requireAuth, requireOfficer, async (request, response, next) => {
    try {
      const result = await ticketService.startWork({
        ticketId: parseTicketId(request.params.id),
        officer: request.user
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/tickets/:id/action-report', requireAuth, requireOfficer, photosUpload, async (request, response, next) => {
    try {
      const ticketId = parseTicketId(request.params.id);
      const report = parseActionReport(request.body, request.files);
      const result = await actionReportService.submit({
        ticketId,
        officer: request.user,
        files: request.files,
        ...report
      });
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/reports/:publicCode', async (request, response, next) => {
    try {
      const ticket = await ticketService.getPublicStatus(parsePublicCode(request.params.publicCode));
      response.json(ticket);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
