export async function findTicketById(db, ticketId) {
  const result = await db.query('SELECT id, ward_id FROM tickets WHERE id = $1', [ticketId]);
  return result.rows[0] ?? null;
}

export async function findTicketDetail(db, { ticketId, wardId }) {
  const values = [ticketId];
  const wardFilter = wardId ? ` AND t.ward_id = $${values.push(wardId)}` : '';
  const result = await db.query(
    `SELECT t.id AS "ticketId", t.public_code AS "publicCode", t.description, t.status,
            t.lat, t.lng, t.street, t.area, t.created_at AS "createdAt",
            t.support_count AS "supportCount", c.name AS "categoryName", w.id AS "wardId", w.name AS "wardName"
     FROM tickets t
     JOIN categories c ON c.id = t.category_id
     JOIN wards w ON w.id = t.ward_id
     WHERE t.id = $1${wardFilter}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function findOriginalMedia(db, ticketId) {
  const result = await db.query(
    `SELECT storage_path AS "storagePath", content_type AS "contentType",
            size_bytes AS "sizeBytes", captured_at AS "capturedAt"
     FROM media
     WHERE ticket_id = $1
       AND type = 'ORIGINAL'
     ORDER BY id
     LIMIT 1`,
    [ticketId]
  );
  return result.rows[0] ?? null;
}

export async function findActionReports(db, ticketId) {
  const result = await db.query(
    `SELECT r.id, r.remarks, r.submitted_at AS "submittedAt", s.full_name AS "officerName",
            r.decision, r.decision_reason AS "decisionReason",
            COALESCE(
              json_agg(json_build_object('storagePath', m.storage_path) ORDER BY m.id)
                FILTER (WHERE m.id IS NOT NULL),
              '[]'
            ) AS photos
     FROM action_reports r
     JOIN staff s ON s.id = r.officer_id
     LEFT JOIN media m ON m.action_report_id = r.id
     WHERE r.ticket_id = $1
     GROUP BY r.id, s.full_name
     ORDER BY r.submitted_at, r.id`,
    [ticketId]
  );
  return result.rows;
}

export async function findStaffTimeline(db, ticketId) {
  const result = await db.query(
    `SELECT h.from_status AS "fromStatus", h.to_status AS "toStatus",
            h.created_at AS "createdAt", h.reason, s.full_name AS "changedByName"
     FROM status_history h
     LEFT JOIN staff s ON s.id = h.changed_by
     WHERE h.ticket_id = $1
     ORDER BY h.created_at, h.id`,
    [ticketId]
  );
  return result.rows;
}

export async function findPublicTicket(db, publicCode) {
  const result = await db.query(
    `SELECT t.public_code AS "publicCode", t.status, t.area,
            t.created_at AS "createdAt", t.support_count AS "supportCount", c.name AS "categoryName", w.name AS "wardName"
     FROM tickets t
     JOIN categories c ON c.id = t.category_id
     LEFT JOIN wards w ON w.id = t.ward_id
     WHERE t.public_code = $1`,
    [publicCode]
  );
  return result.rows[0] ?? null;
}

export async function findPublicTimeline(db, ticketId) {
  const result = await db.query(
    `SELECT from_status AS "fromStatus", to_status AS "toStatus", created_at AS "createdAt"
     FROM status_history
     WHERE ticket_id = $1
     ORDER BY created_at, id`,
    [ticketId]
  );
  return result.rows;
}

export async function lockTicketForOfficer(client, { ticketId, wardId }) {
  const result = await client.query(
    `SELECT id, status
     FROM tickets
     WHERE id = $1
       AND ward_id = $2
     FOR UPDATE`,
    [ticketId, wardId]
  );
  return result.rows[0] ?? null;
}

export async function lockTicket(client, ticketId) {
  const result = await client.query(
    'SELECT id, status FROM tickets WHERE id = $1 FOR UPDATE',
    [ticketId]
  );
  return result.rows[0] ?? null;
}

export async function setTicketStatus(client, { ticketId, status }) {
  const result = await client.query(
    `UPDATE tickets
     SET status = $2,
         updated_at = now()
     WHERE id = $1
     RETURNING status`,
    [ticketId, status]
  );
  return result.rows[0];
}

export async function addStatusHistory(client, { ticketId, fromStatus, toStatus, changedBy, reason = null }) {
  await client.query(
    `INSERT INTO status_history (ticket_id, from_status, to_status, changed_by, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [ticketId, fromStatus, toStatus, changedBy, reason]
  );
}
