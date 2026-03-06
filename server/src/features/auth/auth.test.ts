import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await app.prisma.refreshToken.deleteMany();
  await app.prisma.document.deleteMany();
  await app.prisma.user.deleteMany();
});

const testUser = {
  email: 'test@example.com',
  password: 'password123',
  displayName: 'Test User',
};

describe('POST /api/auth/register', () => {
  it('creates a new user and returns tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: testUser,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.user.email).toBe(testUser.email);
    expect(body.user.displayName).toBe(testUser.displayName);
    expect(body.user.id).toBeDefined();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    // Must not leak password hash
    expect(body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 409 when email already exists', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: testUser,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: testUser,
    });

    expect(response.statusCode).toBe(409);
  });

  it('returns 400 when email is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...testUser, email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...testUser, password: 'short' },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: testUser,
    });
  });

  it('returns tokens for valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: testUser.email, password: testUser.password },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user.email).toBe(testUser.email);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('return 401 for wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: testUser.email, password: 'wrongpassword' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('return 401 for non-existent email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: testUser.password },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns new tokens for valid refresh token', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: testUser,
    });
    const { refreshToken } = registerResponse.json();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    // New refresh token should be different (rotation)
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it('returns 401 for invalid refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'invalid-token' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 when reusing a rotated refresh token', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: testUser,
    });
    const { refreshToken } = registerResponse.json();

    // Use the refresh token once
    await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });

    // Try to use the refresh token again - should fail
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the refresh token', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: testUser,
    });
    const { refreshToken } = registerResponse.json();

    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken },
    });

    expect(logoutResponse.statusCode).toBe(200);

    // Refresh token should no longer work
    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });

    expect(refreshResponse.statusCode).toBe(401);
  });
});
