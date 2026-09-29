import { ApiError } from '../utils/ApiError.js';

function readBearerToken(header) {
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

export function createRequireAuth({ auth, db }) {
  return async function requireAuth(request, response, next) {
    try {
      const token = readBearerToken(request.get('Authorization'));

      if (!token) {
        throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in to continue.');
      }

      const { data, error } = await auth.getUser(token);

      if (error || !data?.user) {
        throw new ApiError(401, 'INVALID_TOKEN', 'Your session is invalid or has expired. Sign in again.');
      }

      const staff = await db.query(
        `SELECT s.id, s.full_name, s.role, s.ward_id, w.name AS ward_name
         FROM staff s
         LEFT JOIN wards w ON w.id = s.ward_id
         WHERE s.id = $1
           AND s.active = TRUE`,
        [data.user.id]
      );
      const user = staff.rows[0];

      if (!user) {
        throw new ApiError(403, 'STAFF_INACTIVE', 'This staff account is inactive or unavailable.');
      }

      request.user = {
        id: user.id,
        name: user.full_name,
        role: user.role,
        wardId: user.ward_id,
        wardName: user.ward_name
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
