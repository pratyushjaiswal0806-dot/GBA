import { ApiError } from '../../utils/ApiError.js';
import { findNearbyOpenTickets, incrementSupport, ticketExists } from './duplicate.queries.js';

export const maxNearbyResults = 3;

export function createDuplicateService({ db, radiusMeters, windowDays }) {
  async function findNearby({ lat, lng, categoryCode }) {
    const tickets = await findNearbyOpenTickets(db, {
      lat, lng, categoryCode, radiusMeters, windowDays, limit: maxNearbyResults
    });

    return { tickets };
  }

  async function addSupport(publicCode) {
    const updated = await incrementSupport(db, publicCode);

    if (updated) return updated;

    if (await ticketExists(db, publicCode)) {
      throw new ApiError(409, 'TICKET_NOT_OPEN', 'This report is already resolved, so support cannot be added.');
    }

    throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
  }

  return { findNearby, addSupport };
}
