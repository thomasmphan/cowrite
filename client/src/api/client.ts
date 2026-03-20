let accessToken: string | null = null;

// Mutex for refresh token requests. Refresh tokens are single-use (rotated on each refresh),
// so concurrent refresh calls would cause all but the first to fail with 401.
// This ensures only one refresh request is in flight at a time.
let refreshPromise: Promise<boolean> | null = null;

// Called when a refresh fails — lets AuthContext clear the user state
// so the app redirects to login instead of showing stale authenticated UI.
let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(callback: (() => void) | null): void {
  onAuthFailure = callback;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    accessToken = data.accessToken;
    return true;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
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
    } else {
      accessToken = null;
      onAuthFailure?.();
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
