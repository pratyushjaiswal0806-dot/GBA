import { ApiError } from '../../utils/ApiError.js';
import { assertCanMove } from '../tickets/ticket.stateMachine.js';
import {
  addStatusHistory,
  findOriginalMedia,
  lockTicket,
  setTicketStatus
} from '../tickets/ticket.queries.js';
import {
  closeTicket,
  countPendingTickets,
  countReportPhotos,
  decideReport,
  findCompareTicket,
  findLatestPendingReport,
  findReportPhotos,
  listPendingTickets,
  lockPendingReport
} from './verifier.queries.js';

export const ticketsPerPage = 20;

function ticketNotFoundError() {
  return new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
}

function notWaitingError() {
  return new ApiError(409, 'ILLEGAL_TRANSITION', 'This ticket is not waiting for verification.');
}

function missingReportError() {
  return new ApiError(
    409,
    'ILLEGAL_TRANSITION',
    'A ticket can only be closed after an Action Taken Report with a photo is submitted.'
  );
}

export function createVerifierService({ db, mediaService, farWarningMeters }) {
  async function listQueue({ page }) {
    const [tickets, total] = await Promise.all([
      listPendingTickets(db, { pageSize: ticketsPerPage, offset: (page - 1) * ticketsPerPage }),
      countPendingTickets(db)
    ]);

    return { tickets, page, pageSize: ticketsPerPage, total };
  }

  async function getCompare(ticketId) {
    const ticket = await findCompareTicket(db, ticketId);

    if (!ticket) throw ticketNotFoundError();
    if (ticket.status !== 'PENDING_VERIFICATION') throw notWaitingError();

    const [original, report] = await Promise.all([
      findOriginalMedia(db, ticketId),
      findLatestPendingReport(db, ticketId)
    ]);

    if (!report) throw missingReportError();

    const photos = await findReportPhotos(db, report.actionReportId);

    return {
      ticketId,
      status: ticket.status,
      original: {
        url: original ? await mediaService.createSignedUrl(original.storagePath) : null,
        capturedAt: original?.capturedAt ?? null,
        lat: ticket.lat,
        lng: ticket.lng
      },
      action: {
        actionReportId: report.actionReportId,
        remarks: report.remarks,
        photos: await Promise.all(photos.map(async (photo) => ({
          url: await mediaService.createSignedUrl(photo.storagePath)
        }))),
        capturedAt: report.capturedAt,
        lat: report.lat,
        lng: report.lng
      },
      distanceMeters: report.distanceMeters,
      farWarning: report.distanceMeters !== null && report.distanceMeters > farWarningMeters
    };
  }

  async function lockWaitingTicket(client, ticketId, toStatus) {
    const ticket = await lockTicket(client, ticketId);

    if (!ticket) throw ticketNotFoundError();

    assertCanMove(ticket.status, toStatus);
    const report = await lockPendingReport(client, ticketId);

    if (!report) throw missingReportError();

    return { ticket, report };
  }

  async function approve({ ticketId, verifier }) {
    return db.withTransaction(async (client) => {
      const { ticket, report } = await lockWaitingTicket(client, ticketId, 'CLOSED');

      if (await countReportPhotos(client, report.id) === 0) throw missingReportError();

      await decideReport(client, { actionReportId: report.id, decision: 'APPROVED', verifierId: verifier.id });
      await closeTicket(client, { ticketId, verifierId: verifier.id });
      await addStatusHistory(client, {
        ticketId,
        fromStatus: ticket.status,
        toStatus: 'CLOSED',
        changedBy: verifier.id
      });

      return { status: 'CLOSED' };
    });
  }

  async function reject({ ticketId, verifier, reason }) {
    return db.withTransaction(async (client) => {
      const { ticket, report } = await lockWaitingTicket(client, ticketId, 'REOPENED');

      await decideReport(client, {
        actionReportId: report.id,
        decision: 'REJECTED',
        verifierId: verifier.id,
        reason
      });
      await setTicketStatus(client, { ticketId, status: 'REOPENED' });
      await addStatusHistory(client, {
        ticketId,
        fromStatus: ticket.status,
        toStatus: 'REOPENED',
        changedBy: verifier.id,
        reason
      });

      return { status: 'REOPENED' };
    });
  }

  return { listQueue, getCompare, approve, reject };
}
