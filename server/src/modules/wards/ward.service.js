export async function findWardByPoint(db, { lat, lng }) {
  const result = await db.query(
    `SELECT id, name
     FROM wards
     WHERE ST_Contains(
       boundary,
       ST_SetSRID(ST_MakePoint($1::double precision, $2::double precision), 4326)
     )
     LIMIT 1`,
    [lng, lat]
  );

  return result.rows[0] ?? null;
}
