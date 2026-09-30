import { text } from '../i18n/en.js';

let accessTokenProvider = async () => null;
let sessionExpiredHandler = null;

export function setAccessTokenProvider(provider) {
  accessTokenProvider = provider;

  return () => {
    if (accessTokenProvider === provider) {
      accessTokenProvider = async () => null;
    }
  };
}

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = handler;

  return () => {
    if (sessionExpiredHandler === handler) {
      sessionExpiredHandler = null;
    }
  };
}

export class ApiClientError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

export async function requestJson(path, { accessToken, ...options } = {}) {
  const token = accessToken === undefined
    ? await accessTokenProvider()
    : accessToken;

  let response;

  try {
    response = await fetch(path, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(token && !options.headers?.Authorization ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiClientError(text.api.networkError, 0, 'NETWORK_ERROR');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const fallbackMessage = response.status === 401 && token
      ? text.api.sessionExpired
      : text.api.statusFallback[response.status] || (
        response.status >= 500 ? text.api.statusFallback[500] : text.api.requestFailed
      );

    if (response.status === 401 && token && sessionExpiredHandler) {
      sessionExpiredHandler();
    }

    throw new ApiClientError(data?.message || fallbackMessage, response.status, data?.code);
  }

  if (data === null) {
    throw new ApiClientError(text.api.networkError, response.status, 'INVALID_RESPONSE');
  }

  return data;
}
