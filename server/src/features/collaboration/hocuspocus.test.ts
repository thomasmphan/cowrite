import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { buildApp } from '../../app.js';

let app: FastifyInstance;
let baseUrl: string;

// --- Helpers ---

async function registerAndGetToken(email: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'password123', displayName: email.split('@')[0] },
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

function connectProvider(
  documentId: string,
  token: string,
): {
  provider: HocuspocusProvider;
  ydoc: Y.Doc;
} {
  const ydoc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: `${baseUrl}/collaboration`,
    name: documentId,
    document: ydoc,
    token,
  });
  return { provider, ydoc };
}

function waitForEvent(provider: HocuspocusProvider, event: string, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
    provider.on(event, () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

// --- Setup ---

beforeAll(async () => {
  app = buildApp();
  // Must call listen() (not just ready()) so the HTTP server exists
  // for WebSocket upgrade requests
  await app.listen({ port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get server address');
  }
  baseUrl = `ws://localhost:${address.port}`;
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

// --- Tests ---

describe('collaboration - authentication', () => {
  it('connects with a valid token', async () => {
    const token = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(token);
    const { provider } = connectProvider(docId, token);

    await waitForEvent(provider, 'synced');

    provider.destroy();
  });

  it('rejects connection without a token', async () => {
    const token = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(token);
    const { provider } = connectProvider(docId, '');

    await waitForEvent(provider, 'authenticationFailed');

    provider.destroy();
  });

  it('rejects connection with an invalid token', async () => {
    const token = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(token);
    const { provider } = connectProvider(docId, 'invalid-jwt-token');

    await waitForEvent(provider, 'authenticationFailed');

    provider.destroy();
  });
});

describe('collaboration - permissions', () => {
  it('allows shared editor to connect', async () => {
    const ownerToken = await registerAndGetToken('owner@example.com');
    const editorEmail = 'editor@example.com';
    const editorToken = await registerAndGetToken(editorEmail);
    const docId = await createDocument(ownerToken);

    await app.inject({
      method: 'POST',
      url: `/api/documents/${docId}/shares`,
      headers: authHeader(ownerToken),
      payload: { email: editorEmail, role: 'EDITOR' },
    });

    const { provider } = connectProvider(docId, editorToken);

    await waitForEvent(provider, 'synced');

    provider.destroy();
  });

  it('rejects connection to nonexistent document', async () => {
    const token = await registerAndGetToken('alice@example.com');
    const { provider } = connectProvider('nonexistent-doc-id', token);

    await waitForEvent(provider, 'authenticationFailed');

    provider.destroy();
  });
});

describe('collaboration - persistence', () => {
  it('saves document content to database', async () => {
    const testString = 'Hello, persistence!';
    const token = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(token);
    const { provider, ydoc } = connectProvider(docId, token);

    await waitForEvent(provider, 'synced');

    ydoc.getText('default').insert(0, testString);

    // Wait for Hopcuspocus debounce to save (server debounce is 2s)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    provider.destroy();

    const doc = await app.prisma.document.findUnique({ where: { id: docId } });
    if (!doc?.ydoc) {
      throw new Error('Document or ydoc not found in database');
    }

    const verifyDoc = new Y.Doc();
    Y.applyUpdate(verifyDoc, new Uint8Array(doc.ydoc));
    expect(verifyDoc.getText('default').toString()).toBe(testString);
  });

  it('loads persisted content on reconnect', async () => {
    const testString = 'Persisted content';
    const token = await registerAndGetToken('alice@example.com');
    const docId = await createDocument(token);

    // First connection: write content
    const { provider: p1, ydoc: doc1 } = connectProvider(docId, token);
    await waitForEvent(p1, 'synced');
    doc1.getText('default').insert(0, testString);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    p1.destroy();

    // Second connection: verify content loads
    const { provider: p2, ydoc: doc2 } = connectProvider(docId, token);
    await waitForEvent(p2, 'synced');

    expect(doc2.getText('default').toString()).toBe(testString);

    p2.destroy();
  });
});
