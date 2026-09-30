import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';

export const reasonMaxLength = 500;

const ticketIdSchema = z.coerce.number().int().positive();
const queueQuerySchema = z.object({
  status: z.literal('PENDING_VERIFICATION').default('PENDING_VERIFICATION'),
  page: z.coerce.number().int().min(1).default(1)
});
const rejectBodySchema = z.object({
  reason: z.string().trim().min(1).max(reasonMaxLength)
});

function parseTicketId(value) {
  const parsed = ticketIdSchema.safeParse(value);

  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_TICKET_ID', 'Ticket id must be a positive integer.');
  }

  return parsed.data;
}

function parseQueueQuery(query) {
  const parsed = queueQuerySchema.safeParse(query);

  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_TICKET_FILTER', 'The verifier queue only lists tickets pending verification.');
  }

  return parsed.data;
}

function parseReason(body) {
  const parsed = rejectBodySchema.safeParse(body ?? {});

  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_REASON', `Give a reason (up to ${reasonMaxLength} characters).`);
  }

  return parsed.data.reason;
}

export function createVerifierRouter({ requireAuth, requireVerifier, verifierService }) {
  const router = Router();

  router.get('/verifier/tickets', requireAuth, requireVerifier, async (request, response, next) => {
    try {
      const { page } = parseQueueQuery(request.query);
      response.json(await verifierService.listQueue({ page }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/tickets/:id/compare', requireAuth, requireVerifier, async (request, response, next) => {
    try {
      response.json(await verifierService.getCompare(parseTicketId(request.params.id)));
    } catch (error) {
      next(error);
    }
  });

  router.post('/tickets/:id/approve', requireAuth, requireVerifier, async (request, response, next) => {
    try {
      const result = await verifierService.approve({
        ticketId: parseTicketId(request.params.id),
        verifier: request.user
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/tickets/:id/reject', requireAuth, requireVerifier, async (request, response, next) => {
    try {
      const result = await verifierService.reject({
        ticketId: parseTicketId(request.params.id),
        verifier: request.user,
        reason: parseReason(request.body)
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
