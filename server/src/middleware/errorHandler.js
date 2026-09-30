import { ApiError } from '../utils/ApiError.js';

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  const isApiError = error instanceof ApiError;
  const isMalformedJson = error instanceof SyntaxError && error.status === 400;
  const isPayloadTooLarge = error.type === 'entity.too.large' || error.status === 413;
  const status = isApiError ? error.status : isMalformedJson ? 400 : isPayloadTooLarge ? 413 : 500;
  const code = isApiError
    ? error.code
    : isMalformedJson
      ? 'INVALID_JSON'
      : isPayloadTooLarge
        ? 'PAYLOAD_TOO_LARGE'
        : 'INTERNAL_SERVER_ERROR';
  const message = isApiError
    ? error.message
    : isMalformedJson
      ? 'Request body contains invalid JSON.'
      : isPayloadTooLarge
        ? 'Request body is too large.'
        : 'Internal server error.';

  response.status(status).json({ status, code, message });
}
