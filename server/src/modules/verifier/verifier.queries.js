export async function listPendingTickets(db, { pageSize, offset }) {
  const result = await db.query(
    `SELECT t.id AS "ticketId", t.public_code AS "publicCode", c.name AS "categoryName",
            w.name AS "wardName", t.status, t.updated_at AS "submittedAt"
     FROM tickets t
     JOIN categories c ON c.id = t.category_id
     JOIN wards w ON w.id = t.ward_id
     WHERE t.status = 'PENDING_VERIFICATION'
     ORDER BY t.updated_at, t.id
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  return result.rows;
}

export async function countPendingTickets(db) {
  const result = await db.query(
    "SELECT count(*)::int AS total FROM tickets WHERE status = 'PENDING_VERIFICATION'"
  );
  return result.rows[0].total;
}

export async function findCompareTicket(db, ticketId) {
  const result = await db.query(
    `SELECT id AS "ticketId", status, lat, lng
     FROM tickets
     WHERE id = $1`,
    [ticketId]
  );
  return result.rows[0] ?? null;
}

export async function findLatestPendingReport(db, ticketId) {
  const result = await db.query(
    `SELECT r.id AS "actionReportId", r.remarks, r.submitted_at AS "capturedAt", r.lat, r.lng,
            round(
              ST_Distance(
                t.location,
                ST_SetSRID(ST_MakePoint(r.lng, r.lat), 4326)::geography
              )::numeric,
              1
            )::float AS "distanceMeters"
     FROM action_reports r
     JOIN tickets t ON t.id = r.ticket_id
     WHERE r.ticket_id = $1
       AND r.decision IS NULL
     ORDER BY r.submitted_at DESC, r.id DESC
     LIMIT 1`,
    [ticketId]
  );
  return result.rows[0] ?? null;
}

export async function findReportPhotos(db, actionReportId) {
  const result = await db.query(
    `SELECT storage_path AS "storagePath"
     FROM media
     WHERE action_report_id = $1
       AND type = 'ACTION'
     ORDER BY id`,
    [actionReportId]
  );
  return result.rows;
}

export async function lockPendingReport(client, ticketId) {
  const result = await client.query(
    `SELECT r.id
     FROM action_reports r
     WHERE r.ticket_id = $1
       AND r.decision IS NULL
     ORDER BY r.submitted_at DESC, r.id DESC
     LIMIT 1
     FOR UPDATE`,
    [ticketId]
  );
  return result.rows[0] ?? null;
}

export async function countReportPhotos(client, actionReportId) {
  const result = await client.query(
    "SELECT count(*)::int AS total FROM media WHERE action_report_id = $1 AND type = 'ACTION'",
    [actionReportId]
  );
  return result.rows[0].total;
}

export async function decideReport(client, { actionReportId, decision, verifierId, reason = null }) {
  await client.query(
    `UPDATE action_reports
     SET decision = $2, decided_by = $3, decided_at = now(), decision_reason = $4
     WHERE id = $1`,
    [actionReportId, decision, verifierId, reason]
  );
}

export async function closeTicket(client, { ticketId, verifierId }) {
  await client.query(
    `UPDATE tickets
     SET status = 'CLOSED', closed_by = $2, closed_at = now(), updated_at = now()
     WHERE id = $1`,
    [ticketId, verifierId]
  );
}
