import { ApiError } from '../../utils/ApiError.js';
import { assertCanMove } from './ticket.stateMachine.js';
import {
  addStatusHistory,
  findOriginalMedia,
  findPublicTicket,
  findPublicTimeline,
  findStaffTimeline,
  findTicketById,
  findTicketDetail,
  lockTicketForOfficer,
  setTicketStatus
} from './ticket.queries.js';

function ticketNotFoundError() {
  return new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
}

function otherWardError() {
  return new ApiError(403, 'FORBIDDEN', 'You do not have access to this ticket.');
}

export function createTicketService({ db, mediaService }) {
  async function getStaffDetail({ ticketId, user }) {
    const existingTicket = await findTicketById(db, ticketId);

    if (!existingTicket) {
      throw ticketNotFoundError();
    }

    const ticket = await findTicketDetail(db, {
      ticketId,
      wardId: user.role === 'OFFICER' ? user.wardId : null
    });

    if (!ticket) {
      throw otherWardError();
    }

    const [media, timeline] = await Promise.all([
      findOriginalMedia(db, ticketId),
      findStaffTimeline(db, ticketId)
    ]);
    const original = media
      ? {
          url: await mediaService.createSignedUrl(media.storagePath),
          capturedAt: media.capturedAt,
          contentType: media.contentType,
          sizeBytes: media.sizeBytes
        }
      : null;

    return { ...ticket, original, timeline };
  }

  async function startWork({ ticketId, officer }) {
    const ticket = await findTicketById(db, ticketId);

    if (!ticket) {
      throw ticketNotFoundError();
    }

    if (ticket.ward_id !== officer.wardId) {
      throw otherWardError();
    }

    return db.withTransaction(async (client) => {
      const lockedTicket = await lockTicketForOfficer(client, {
        ticketId,
        wardId: officer.wardId
      });

      if (!lockedTicket) {
        throw otherWardError();
      }

      assertCanMove(lockedTicket.status, 'IN_PROGRESS');
      const updated = await setTicketStatus(client, { ticketId, status: 'IN_PROGRESS' });
      await addStatusHistory(client, {
        ticketId,
        fromStatus: lockedTicket.status,
        toStatus: updated.status,
        changedBy: officer.id
      });

      return { status: updated.status };
    });
  }

  async function getPublicStatus(publicCode) {
    const ticket = await findPublicTicket(db, publicCode);

    if (!ticket) {
      throw ticketNotFoundError();
    }

    const result = await db.query('SELECT id FROM tickets WHERE public_code = $1', [publicCode]);
    const timeline = await findPublicTimeline(db, result.rows[0].id);

    return { ...ticket, timeline };
  }

  return { getStaffDetail, getPublicStatus, startWork };
}
