import { ApiError } from '../utils/ApiError.js';

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  const isApiError = error instanceof ApiError;
  const isMalformedJson = error instanceof SyntaxError && error.status === 400;
  const status = isApiError ? error.status : isMalformedJson ? 400 : 500;
  const code = isApiError
    ? error.code
    : isMalformedJson
      ? 'INVALID_JSON'
      : 'INTERNAL_SERVER_ERROR';
  const message = isApiError
    ? error.message
    : isMalformedJson
      ? 'Request body contains invalid JSON.'
      : 'Internal server error.';

  response.status(status).json({ status, code, message });
}
