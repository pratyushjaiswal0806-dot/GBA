-- Three adjacent sample wards around central Bengaluru for the pilot.
-- Interior test points are printed by server/scripts/seed.js.
INSERT INTO wards (name, boundary) VALUES
  (
    'Sample Ward A',
    extensions.ST_Multi(extensions.ST_GeomFromText(
      'POLYGON((77.588 12.968, 77.598 12.968, 77.598 12.976, 77.588 12.976, 77.588 12.968))',
      4326
    ))
  ),
  (
    'Sample Ward B',
    extensions.ST_Multi(extensions.ST_GeomFromText(
      'POLYGON((77.598 12.968, 77.608 12.968, 77.608 12.976, 77.598 12.976, 77.598 12.968))',
      4326
    ))
  ),
  (
    'Sample Ward C',
    extensions.ST_Multi(extensions.ST_GeomFromText(
      'POLYGON((77.588 12.976, 77.598 12.976, 77.598 12.984, 77.588 12.984, 77.588 12.976))',
      4326
    ))
  );
