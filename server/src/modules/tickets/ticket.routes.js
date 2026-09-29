import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';

const ticketIdSchema = z.coerce.number().int().positive();
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

function parsePublicCode(value) {
  const parsed = publicCodeSchema.safeParse(value);
  if (!parsed.success) throw invalidPublicCodeError();
  return parsed.data;
}

export function createTicketRouter({ requireAuth, requireOfficer, ticketService }) {
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
