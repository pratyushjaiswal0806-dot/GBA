import { ApiError } from '../../utils/ApiError.js';
import { findWardByPoint } from '../wards/ward.service.js';
import { createPublicCode } from '../../utils/publicCode.js';

async function findReportableCategory(db, categoryCode) {
  const result = await db.query(
    `SELECT id, code, name
     FROM categories
     WHERE code = $1
       AND reportable = TRUE`,
    [categoryCode]
  );

  return result.rows[0] ?? null;
}

async function findActiveOfficer(db, wardId) {
  const result = await db.query(
    `SELECT id
     FROM staff
     WHERE ward_id = $1
       AND role = 'OFFICER'
       AND active = TRUE
     ORDER BY created_at
     LIMIT 1`,
    [wardId]
  );

  return result.rows[0] ?? null;
}

async function reserveTicketId(db) {
  const result = await db.query(
    `SELECT nextval(pg_get_serial_sequence('tickets', 'id'))::int AS id`
  );

  return result.rows[0].id;
}

function outsidePilotError() {
  return new ApiError(422, 'OUTSIDE_PILOT_AREA', 'This location is outside the pilot wards.');
}

function unknownCategoryError() {
  return new ApiError(400, 'INVALID_CATEGORY', 'Choose a reportable category.');
}

export function createReportService({ db, geocoder, mediaService }) {
  async function create({ categoryCode, description, lat, lng, file }) {
    const [category, ward] = await Promise.all([
      findReportableCategory(db, categoryCode),
      findWardByPoint(db, { lat, lng })
    ]);

    if (!category) {
      throw unknownCategoryError();
    }

    if (!ward) {
      throw outsidePilotError();
    }

    const officer = await findActiveOfficer(db, ward.id);
    const address = await geocoder.reverse({ lat, lng });
    const ticketId = await reserveTicketId(db);
    const photo = await mediaService.clean(file);
    const uploadedPhoto = await mediaService.uploadPhoto({ ticketId, photo });
    const status = officer ? 'OPEN' : 'SUBMITTED';
    const publicCode = createPublicCode();

    try {
      await db.withTransaction(async (client) => {
        await client.query(
          `INSERT INTO tickets (
             id, public_code, category_id, description, lat, lng, street, area,
             ward_id, status, assigned_officer_id, is_demo
           ) OVERRIDING SYSTEM VALUE
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, FALSE)`,
          [
            ticketId,
            publicCode,
            category.id,
            description,
            lat,
            lng,
            address?.street ?? null,
            address?.area ?? null,
            ward.id,
            status,
            officer?.id ?? null
          ]
        );
        await client.query(
          `INSERT INTO media (ticket_id, type, storage_path, content_type, size_bytes)
           VALUES ($1, 'ORIGINAL', $2, $3, $4)`,
          [ticketId, uploadedPhoto.storagePath, uploadedPhoto.contentType, uploadedPhoto.sizeBytes]
        );
        await client.query(
          `INSERT INTO status_history (ticket_id, from_status, to_status)
           VALUES ($1, NULL, $2)`,
          [ticketId, status]
        );
      });
    } catch (error) {
      await mediaService.remove(uploadedPhoto.storagePath);
      throw error;
    }

    return {
      publicCode,
      status,
      ward: ward.name,
      street: address?.street ?? null,
      area: address?.area ?? null
    };
  }

  return { create };
}
