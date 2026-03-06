import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { errorHandler } from './error-handler.js';
import {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(errorHandler);

  // Test routes that throw specific errors
  app.get('/not-found', async () => {
    throw new NotFoundError('Document not found');
  });

  app.get('/unauthorized', async () => {
    throw new UnauthorizedError('Invalid token');
  });

  app.get('/forbidden', async () => {
    throw new ForbiddenError('No access');
  });

  app.get('/conflict', async () => {
    throw new ConflictError('Already exists');
  });

  app.post(
    '/validation',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', format: 'email' } },
        },
      },
    },
    async () => {
      return { ok: true };
    },
  );

  app.get('/unexpected', async () => {
    throw new Error('database connection lost');
  });

  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('error handler', () => {
  it('returns 404 with NOT_FOUND for NotFoundError', async () => {
    const response = await app.inject({ method: 'GET', url: '/not-found' });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe('NOT_FOUND');
    expect(body.message).toBe('Document not found');
  });

  it('returns 401 with UNAUTHORIZED for UnauthorizedError', async () => {
    const response = await app.inject({ method: 'GET', url: '/unauthorized' });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.message).toBe('Invalid token');
  });

  it('returns 403 with FORBIDDEN for ForbiddenError', async () => {
    const response = await app.inject({ method: 'GET', url: '/forbidden' });

    expect(response.statusCode).toBe(403);
    const body = response.json();
    expect(body.error).toBe('FORBIDDEN');
    expect(body.message).toBe('No access');
  });

  it('returns 409 with CONFLICT for ConflictError', async () => {
    const response = await app.inject({ method: 'GET', url: '/conflict' });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error).toBe('CONFLICT');
    expect(body.message).toBe('Already exists');
  });

  it('returns 400 with VALIDATION_ERROR for schema failures', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/validation',
      payload: { email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toBeDefined();
  });

  it('returns 500 with generic message for unexpected errors', async () => {
    const response = await app.inject({ method: 'GET', url: '/unexpected' });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error).toBe('INTERNAL_SERVER_ERROR');
    expect(body.message).toBe('Something went wrong');
  });

  it('does not leak internal error details on 500', async () => {
    const response = await app.inject({ method: 'GET', url: '/unexpected' });

    const body = response.json();
    expect(body.message).not.toContain('database connection lost');
  });
});
