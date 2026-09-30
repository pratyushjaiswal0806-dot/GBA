const closedStatuses = "('CLOSED', 'REJECTED')";

export async function findNearbyOpenTickets(db, { lat, lng, categoryCode, radiusMeters, windowDays, limit }) {
  const result = await db.query(
    `SELECT t.public_code AS "publicCode", c.name AS "categoryName", t.status, t.street, t.area,
            w.name AS "wardName", t.created_at AS "createdAt", t.support_count AS "supportCount",
            round(ST_Distance(t.location, point.geog)::numeric)::int AS "distanceMeters"
     FROM tickets t
     JOIN categories c ON c.id = t.category_id
     LEFT JOIN wards w ON w.id = t.ward_id
     CROSS JOIN (
       SELECT ST_SetSRID(ST_MakePoint($2::double precision, $1::double precision), 4326)::geography AS geog
     ) point
     WHERE c.code = $3
       AND ST_DWithin(t.location, point.geog, $4::double precision)
       AND t.status NOT IN ${closedStatuses}
       AND t.created_at >= now() - ($5::int * interval '1 day')
     ORDER BY ST_Distance(t.location, point.geog), t.id
     LIMIT $6`,
    [lat, lng, categoryCode, radiusMeters, windowDays, limit]
  );
  return result.rows;
}

export async function incrementSupport(db, publicCode) {
  const result = await db.query(
    `UPDATE tickets
     SET support_count = support_count + 1
     WHERE public_code = $1
       AND status NOT IN ${closedStatuses}
     RETURNING public_code AS "publicCode", support_count AS "supportCount"`,
    [publicCode]
  );
  return result.rows[0] ?? null;
}

export async function ticketExists(db, publicCode) {
  const result = await db.query('SELECT 1 FROM tickets WHERE public_code = $1', [publicCode]);
  return result.rowCount > 0;
}
