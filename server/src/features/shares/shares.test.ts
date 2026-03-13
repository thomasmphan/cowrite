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

async function createDocument(token: string, title = 'Test Doc'): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/documents',
    headers: authHeader(token),
    payload: { title },
  });
  return response.json().id;
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

describe('POST /api/documents/:id/shares', () => {
  it('shares a document with another user', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const doctId = await createDocument(aliceToken);

    const bobRole = 'EDITOR';
    const bobEmail = 'bob@example.com';
    await registerAndGetToken(bobEmail);

    const response = await app.inject({
      method: 'POST',
      url: `/api/documents/${doctId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: bobRole },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.documentId).toBe(doctId);
    expect(body.role).toBe(bobRole);
    expect(body.user.email).toBe(bobEmail);
  });

  it('returns 404 when sharing a non-existent document', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const bobRole = 'VIEWER';
    const bobEmail = 'bob@example.com';
    await registerAndGetToken(bobEmail);

    const response = await app.inject({
      method: 'POST',
      url: '/api/documents/00000000-0000-0000-0000-000000000000/shares',
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: bobRole },
    });

    expect(response.statusCode).toBe(404);
  });

  it('returns 404 when target user does not exist', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const doctId = await createDocument(aliceToken);

    const response = await app.inject({
      method: 'POST',
      url: `/api/documents/${doctId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: 'nobody@example.com', role: 'VIEWER' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('returns 403 when sharing with yourself', async () => {
    const email = 'alice@example.com';
    const aliceToken = await registerAndGetToken(email);
    const doctId = await createDocument(aliceToken);

    const response = await app.inject({
      method: 'POST',
      url: `/api/documents/${doctId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email, role: 'EDITOR' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 403 when sharing with the same user twice', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const doctId = await createDocument(aliceToken);

    const bobEmail = 'bob@example.com';
    await registerAndGetToken(bobEmail);

    await app.inject({
      method: 'POST',
      url: `/api/documents/${doctId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'VIEWER' },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/documents/${doctId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'EDITOR' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 404 when non-owner tries to share', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const bobToken = await registerAndGetToken('bob@example.com');
    const doctId = await createDocument(aliceToken);

    const charlieEmail = 'charlie@example.com';
    await registerAndGetToken(charlieEmail);

    const response = await app.inject({
      method: 'POST',
      url: `/api/documents/${doctId}/shares`,
      headers: authHeader(bobToken),
      payload: { email: charlieEmail, role: 'VIEWER' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('GET /api/documents/:id/shares', async () => {
  it('lists shares for a document', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(aliceToken);

    const bobEmail = 'bob@example.com';
    await registerAndGetToken(bobEmail);

    await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'EDITOR' },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
    });

    expect(response.statusCode).toBe(200);
    const shares = response.json();
    expect(shares).toHaveLength(1);
    expect(shares[0].user.email).toBe(bobEmail);
  });

  it('returns 404 when non-owner lists shares', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const bobToken = await registerAndGetToken('bob@example.com');
    const docId = await createDocument(aliceToken);

    const response = await app.inject({
      method: 'GET',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(bobToken),
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('PATCH /api/documents/:id/shares/:shareId', () => {
  it('updates a share role', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(aliceToken);

    const editor = 'EDITOR';
    const bobEmail = 'bob@example.com';
    await registerAndGetToken(bobEmail);

    const shareResponse = await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'VIEWER' },
    });
    const { id: shareId } = shareResponse.json();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${docId}/shares/${shareId}`,
      headers: authHeader(aliceToken),
      payload: { role: editor },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().role).toBe(editor);
  });

  it('returns 404 when non-owner updates share', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(aliceToken);
    const bobEmail = 'bob@example.com';
    const bobToken = await registerAndGetToken(bobEmail);

    const shareResponse = await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'VIEWER' },
    });
    const { id: shareId } = shareResponse.json();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${docId}/shares/${shareId}`,
      headers: authHeader(bobToken),
      payload: { role: 'EDITOR' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /api/documents/:id/shares/:shareId', () => {
  it('revokes a share', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(aliceToken);
    const bobEmail = 'bob@example.com';
    const bobToken = await registerAndGetToken(bobEmail);

    const shareResponse = await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'EDITOR' },
    });
    const { id: shareId } = shareResponse.json();

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/documents/${docId}/shares/${shareId}`,
      headers: authHeader(aliceToken),
    });

    expect(deleteResponse.statusCode).toBe(204);

    // Verify Bob can no longer access the document
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/documents/${docId}`,
      headers: authHeader(bobToken),
    });

    expect(getResponse.statusCode).toBe(404);
  });
});

describe('Document access with shares', () => {
  it('shared user can read the document', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const docTitle = 'Shared Doc';
    const docId = await createDocument(aliceToken, docTitle);
    const bobEmail = 'bob@example.com';
    const bobToken = await registerAndGetToken(bobEmail);

    await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'VIEWER' },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/documents/${docId}`,
      headers: authHeader(bobToken),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().title).toBe(docTitle);
  });

  it('editor can update the document', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(aliceToken);
    const bobEmail = 'bob@example.com';
    const bobToken = await registerAndGetToken(bobEmail);

    await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'EDITOR' },
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${docId}`,
      headers: authHeader(bobToken),
      payload: { title: 'Updated by Bob' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().title).toBe('Updated by Bob');
  });

  it('viewer cannot update the document', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(aliceToken);
    const bobEmail = 'bob@example.com';
    const bobToken = await registerAndGetToken(bobEmail);

    await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: 'bob@example.com', role: 'VIEWER' },
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${docId}`,
      headers: authHeader(bobToken),
      payload: { title: 'Should Fail' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('shared user cannot delete the document', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(aliceToken);
    const bobEmail = 'bob@example.com';
    const bobToken = await registerAndGetToken(bobEmail);

    await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'EDITOR' },
    });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/documents/${docId}`,
      headers: authHeader(bobToken),
    });

    expect(response.statusCode).toBe(404);
  });

  it('shared documents appear in list', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const docTitle = 'Shared Doc';
    const docId = await createDocument(aliceToken, docTitle);
    const bobEmail = 'bob@example.com';
    const bobToken = await registerAndGetToken('bob@example.com');

    await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'VIEWER' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/documents',
      headers: authHeader(bobToken),
    });

    expect(response.statusCode).toBe(200);
    const docs = response.json();
    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe(docTitle);
  });

  it('changing role from viewer to editor grants update access', async () => {
    const aliceToken = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(aliceToken);
    const bobTitle = 'Update by Bob';
    const bobEmail = 'bob@example.com';
    const bobToken = await registerAndGetToken(bobEmail);

    const shareResponse = await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(aliceToken),
      payload: { email: bobEmail, role: 'VIEWER' },
    });
    const { id: shareId } = shareResponse.json();

    // Bob can't update as viewer
    const failResponse = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${docId}`,
      headers: authHeader(bobToken),
      payload: { title: 'Should Fail' },
    });
    expect(failResponse.statusCode).toBe(403);

    // Alice upgrades Bob to editor
    await app.inject({
      method: 'PATCH',
      url: `/api/documents/${docId}/shares/${shareId}`,
      headers: authHeader(aliceToken),
      payload: { role: 'EDITOR' },
    });

    // Bob can now update
    const successResponse = await app.inject({
      method: 'PATCH',
      url: `/api/documents/${docId}`,
      headers: authHeader(bobToken),
      payload: { title: bobTitle },
    });
    expect(successResponse.statusCode).toBe(200);
    expect(successResponse.json().title).toBe(bobTitle);
  });
});
