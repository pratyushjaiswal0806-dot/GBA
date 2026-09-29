import { ApiError } from '../utils/ApiError.js';

export function requireRole(...roles) {
  return function requireAllowedRole(request, response, next) {
    if (!request.user) {
      next(new ApiError(401, 'AUTH_REQUIRED', 'Sign in to continue.'));
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new ApiError(403, 'FORBIDDEN', 'You do not have access to this area.'));
      return;
    }

    next();
  };
}
