import { apiClient, setAccessToken } from './client';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  const data: AuthResponse = await response.json();
  setAccessToken(data.accessToken);
  return data;
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }

  const data: AuthResponse = await response.json();
  setAccessToken(data.accessToken);
  return data;
}

export async function refresh(): Promise<AuthResponse | null> {
  const response = await fetch('/api/auth/refresh', { method: 'POST' });

  if (!response.ok) {
    setAccessToken(null);
    return null;
  }

  const data: AuthResponse = await response.json();
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/api/auth/logout', {});
  setAccessToken(null);
}
