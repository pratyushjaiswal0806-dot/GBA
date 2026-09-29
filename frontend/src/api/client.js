let accessTokenProvider = async () => null;

export function setAccessTokenProvider(provider) {
  accessTokenProvider = provider;

  return () => {
    if (accessTokenProvider === provider) {
      accessTokenProvider = async () => null;
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
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(token && !options.headers?.Authorization ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiClientError(data?.message || 'Request failed.', response.status, data?.code);
  }

  return data;
}
