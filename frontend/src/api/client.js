export class ApiClientError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

export async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers
    }
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiClientError(data?.message || 'Request failed.', response.status);
  }

  return data;
}
