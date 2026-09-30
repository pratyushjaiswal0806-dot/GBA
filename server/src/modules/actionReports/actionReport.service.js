import { ApiError } from '../../utils/ApiError.js';
import { assertCanMove } from '../tickets/ticket.stateMachine.js';
import {
  addStatusHistory,
  findTicketById,
  lockTicketForOfficer,
  setTicketStatus
} from '../tickets/ticket.queries.js';

const pendingStatus = 'PENDING_VERIFICATION';

async function insertActionReport(client, { ticketId, officerId, remarks, lat, lng }) {
  const result = await client.query(
    `INSERT INTO action_reports (ticket_id, officer_id, remarks, lat, lng)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [ticketId, officerId, remarks, lat, lng]
  );
  return result.rows[0].id;
}

async function insertActionMedia(client, { ticketId, actionReportId, photo, lat, lng }) {
  await client.query(
    `INSERT INTO media (ticket_id, action_report_id, type, storage_path, content_type, size_bytes, lat, lng)
     VALUES ($1, $2, 'ACTION', $3, $4, $5, $6, $7)`,
    [ticketId, actionReportId, photo.storagePath, photo.contentType, photo.sizeBytes, lat, lng]
  );
}

export function createActionReportService({ db, mediaService }) {
  async function assertOfficerOwnsTicket(ticketId, officer) {
    const ticket = await findTicketById(db, ticketId);

    if (!ticket) {
      throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket not found.');
    }

    if (ticket.ward_id !== officer.wardId) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this ticket.');
    }
  }

  async function saveReport({ ticketId, officer, remarks, lat, lng, photos }) {
    return db.withTransaction(async (client) => {
      const ticket = await lockTicketForOfficer(client, { ticketId, wardId: officer.wardId });

      if (!ticket) {
        throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this ticket.');
      }

      assertCanMove(ticket.status, pendingStatus);
      const actionReportId = await insertActionReport(client, {
        ticketId, officerId: officer.id, remarks, lat, lng
      });

      for (const photo of photos) {
        await insertActionMedia(client, { ticketId, actionReportId, photo, lat, lng });
      }

      await setTicketStatus(client, { ticketId, status: pendingStatus });
      await addStatusHistory(client, {
        ticketId,
        fromStatus: ticket.status,
        toStatus: pendingStatus,
        changedBy: officer.id
      });

      return { status: pendingStatus, actionReportId };
    });
  }

  async function submit({ ticketId, officer, remarks, lat, lng, files }) {
    await assertOfficerOwnsTicket(ticketId, officer);

    const cleaned = await Promise.all(files.map((file) => mediaService.clean(file)));
    const photos = [];

    try {
      for (const photo of cleaned) {
        photos.push(await mediaService.uploadPhoto({ ticketId, photo }));
      }

      return await saveReport({ ticketId, officer, remarks, lat, lng, photos });
    } catch (error) {
      await Promise.all(photos.map((photo) => mediaService.remove(photo.storagePath)));
      throw error;
    }
  }

  return { submit };
}
