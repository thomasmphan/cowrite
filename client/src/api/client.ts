let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<boolean> {
  const response = await fetch('/api/auth/refresh', { method: 'POST' });
  if (!response.ok) {
    return false;
  }
  const data = await response.json();
  accessToken = data.accessToken;
  return true;
}

async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });

  // If 401, try refreshing the token and retry once
  if (response.status == 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${accessToken}`);
      return fetch(url, { ...options, headers });
    }
  }

  return response;
}

export const apiClient = {
  get: (url: string): Promise<Response> => apiRequest(url),

  post: (url: string, body: unknown): Promise<Response> =>
    apiRequest(url, { method: 'POST', body: JSON.stringify(body) }),

  patch: (url: string, body: unknown): Promise<Response> =>
    apiRequest(url, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: (url: string): Promise<Response> => apiRequest(url, { method: 'DELETE' }),
};
