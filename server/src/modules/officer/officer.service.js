const ticketStatuses = [
  'SUBMITTED',
  'OPEN',
  'IN_PROGRESS',
  'PENDING_VERIFICATION',
  'CLOSED',
  'REOPENED',
  'REJECTED'
];

const ticketsPerPage = 20;

export { ticketStatuses };

export function createOfficerService({ db }) {
  async function listTickets({ wardId, status, page }) {
    const filters = ['t.ward_id = $1'];
    const values = [wardId];

    if (status) {
      values.push(status);
      filters.push(`t.status = $${values.length}`);
    }

    const whereClause = filters.join(' AND ');
    const offset = (page - 1) * ticketsPerPage;
    values.push(ticketsPerPage, offset);

    const result = await db.query(
      `SELECT t.public_code AS "publicCode", c.name AS "categoryName", t.status,
              t.created_at AS "createdAt"
       FROM tickets t
       JOIN categories c ON c.id = t.category_id
       WHERE ${whereClause}
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    const countValues = status ? [wardId, status] : [wardId];
    const total = await db.query(
      `SELECT count(*)::int AS total
       FROM tickets t
       WHERE ${whereClause}`,
      countValues
    );

    return {
      tickets: result.rows,
      page,
      pageSize: ticketsPerPage,
      total: total.rows[0].total
    };
  }

  async function getCounts({ wardId }) {
    const result = await db.query(
      `SELECT
         count(*) FILTER (WHERE status = 'OPEN')::int AS open,
         count(*) FILTER (WHERE status = 'REOPENED')::int AS reopened
       FROM tickets
       WHERE ward_id = $1`,
      [wardId]
    );

    return result.rows[0];
  }

  return { listTickets, getCounts };
}
