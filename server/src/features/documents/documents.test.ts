import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';

let app: FastifyInstance;

async function registerAndGetToken(
  email: string,
  password = 'password123',
  displayName = 'Test User',
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password, displayName },
  });
  return response.json().accessToken;
}

function authHeader(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await app.prisma.documentShare.deleteMany();
  await app.prisma.refreshToken.deleteMany();
  await app.prisma.document.deleteMany();
  await app.prisma.user.deleteMany();
});

describe('POST /api/documents', () => {
  it('creates a document with defaults', async () => {
    const token = await registerAndGetToken('alice@example.com');

    const response = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(token),
      payload: {},
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe('Untitled');
    expect(body.ownerId).toBeDefined();
  });

  it('creates a document with title and content', async () => {
    const token = await registerAndGetToken('alice@example.com');
    const title = 'Alice Doc';
    const content = { type: 'doc', content: [] };

    const response = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(token),
      payload: { title, content },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.title).toBe(title);
    expect(body.content).toEqual(content);
  });

  it('returns 401 without auth token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/documents',
      payload: {},
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /api/documents', () => {
  it('returns only the authenticated user documents', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const bobToken = await registerAndGetToken('bob@example.com');
    const expectedTitle = 'Alice Doc';

    await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(aliceToken),
      payload: { title: expectedTitle },
    });
    await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(bobToken),
      payload: { title: 'Bob Doc' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/documents',
      headers: authHeader(aliceToken),
    });

    expect(response.statusCode).toBe(200);
    const docs = response.json();
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe(expectedTitle);
  });

  it('returns empty array when user has no documents', async () => {
    const token = await registerAndGetToken('alice@example.com');

    const response = await app.inject({
      method: 'GET',
      url: '/api/documents',
      headers: authHeader(token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});

describe('GET /api/documents/:id', () => {
  it('returns a document by id', async () => {
    const token = await registerAndGetToken('alice@example.com');
    const title = 'Alice Doc';

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(token),
      payload: { title },
    });
    const { id } = createResponse.json();

    const response = await app.inject({
      method: 'GET',
      url: `/api/documents/${id}`,
      headers: authHeader(token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().title).toBe(title);
  });

  it('returns 404 for another user document', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const bobToken = await registerAndGetToken('bob@example.com');

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(aliceToken),
      payload: { title: 'Alice Doc' },
    });
    const { id } = createResponse.json();

    const response = await app.inject({
      method: 'GET',
      url: `/api/documents/${id}`,
      headers: authHeader(bobToken),
    });

    expect(response.statusCode).toBe(404);
  });

  it('returns 404 for non-existent document', async () => {
    const token = await registerAndGetToken('alice@example.com');

    const response = await app.inject({
      method: 'GET',
      url: '/api/documents/00000000-0000-0000-0000-000000000000',
      headers: authHeader(token),
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('PATCH /api/documents/:id', () => {
  it('updates the title', async () => {
    const token = await registerAndGetToken('alice@example.com');
    const newTitle = 'New Title';

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(token),
      payload: { title: 'Old Title' },
    });
    const { id } = createResponse.json();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${id}`,
      headers: authHeader(token),
      payload: { title: newTitle },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().title).toBe(newTitle);
  });

  it('updates content without changing title', async () => {
    const token = await registerAndGetToken('alice@example.com');
    const title = 'Alice Doc';
    const content = { type: 'doc', content: [{ type: 'paragraph' }] };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(token),
      payload: { title },
    });
    const { id } = createResponse.json();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${id}`,
      headers: authHeader(token),
      payload: { content },
    });

    expect(response.statusCode).toBe(200);
    const doc = response.json();
    expect(doc.title).toBe(title);
    expect(doc.content).toEqual(content);
  });

  it('returns 404 when updating another user document', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const bobToken = await registerAndGetToken('bob@example.com');

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(aliceToken),
      payload: { title: 'Alice Doc' },
    });
    const { id } = createResponse.json();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${id}`,
      headers: authHeader(bobToken),
      payload: { title: 'Bob Doc' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /api/documents/:id', () => {
  it('deletes a document', async () => {
    const token = await registerAndGetToken('alice@example.com');

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(token),
      payload: { title: 'Alice Doc' },
    });
    const { id } = createResponse.json();

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/documents/${id}`,
      headers: authHeader(token),
    });

    expect(deleteResponse.statusCode).toBe(204);

    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/documents/${id}`,
      headers: authHeader(token),
    });

    expect(getResponse.statusCode).toBe(404);
  });

  it('returns 404 when deleting another user document', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const bobToken = await registerAndGetToken('bob@example.com');

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: authHeader(aliceToken),
      payload: { title: 'Alice Doc' },
    });
    const { id } = createResponse.json();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/documents/${id}`,
      headers: authHeader(bobToken),
    });

    expect(response.statusCode).toBe(404);
  });
});
