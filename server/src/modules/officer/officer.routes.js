import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';
import { ticketStatuses } from './officer.service.js';

const ticketFilterSchema = z.object({
  status: z.enum(ticketStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1)
});

function invalidFilterError() {
  return new ApiError(400, 'INVALID_TICKET_FILTER', 'Choose a valid ticket status and page.');
}

export function createOfficerRouter({ requireAuth, requireOfficer, officerService }) {
  const router = Router();

  router.use(requireAuth, requireOfficer);

  router.get('/officer/tickets', async (request, response, next) => {
    try {
      const parsed = ticketFilterSchema.safeParse(request.query);

      if (!parsed.success) {
        throw invalidFilterError();
      }

      const tickets = await officerService.listTickets({
        wardId: request.user.wardId,
        ...parsed.data
      });
      response.json(tickets);
    } catch (error) {
      next(error);
    }
  });

  router.get('/officer/tickets/counts', async (request, response, next) => {
    try {
      const counts = await officerService.getCounts({ wardId: request.user.wardId });
      response.json(counts);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
