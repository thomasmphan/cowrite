import {
  Hocuspocus,
  onAuthenticatePayload,
  onLoadDocumentPayload,
  onStoreDocumentPayload,
} from '@hocuspocus/server';
import * as Y from 'yjs';
import jwt from 'jsonwebtoken';
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { WebSocketServer } from 'ws';
import { env } from '../../config/env.js';

export default fp(async (app: FastifyInstance) => {
  const hocuspocus = new Hocuspocus({
    quiet: true,

    // debounce: wait 2s after the last edit before persisting to DB
    // maxDebounce: force a save after 10s even if edits keep coming
    debounce: 2000,
    maxDebounce: 10000,

    async onAuthenticate(data: onAuthenticatePayload): Promise<{ userId: string }> {
      // Verify the JWT token sent by the client
      let payload: { sub: string };
      try {
        payload = jwt.verify(data.token, env.jwt.secret) as { sub: string };
      } catch {
        throw new Error('Authentication failed');
      }

      const userId = payload.sub;
      const documentId = data.documentName;

      // Check the user has access to this document (owner or shared)
      const document = await app.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      if (document.ownerId !== userId) {
        const share = await app.prisma.documentShare.findUnique({
          where: { documentId_userId: { documentId, userId } },
        });

        if (!share) {
          throw new Error('Access denied');
        }

        // Viewer get read-only access
        if (share.role === 'VIEWER') {
          data.connectionConfig.readOnly = true;
        }
      }

      return { userId };
    },

    async onLoadDocument(data: onLoadDocumentPayload): Promise<void> {
      const documentId = data.documentName;
      const document = await app.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (document?.ydoc) {
        Y.applyUpdate(data.document, new Uint8Array(document.ydoc));
      }
    },

    async onStoreDocument(data: onStoreDocumentPayload): Promise<void> {
      const documentId = data.documentName;

      // Encode full Yjs document state as a compact binary (includes CRDT metadata
      // needed for conflict-free merging, not just the document content)
      const state = Y.encodeStateAsUpdate(data.document);

      await app.prisma.document.update({
        where: { id: documentId },
        data: { ydoc: Buffer.from(state) },
      });
    },
  });

  // WebSocket server that doesn't listen on its own - we handle upgrades manually
  const wss = new WebSocketServer({ noServer: true });

  // Route WebSocket upgrades on /collaboration to HocusPocus
  app.server.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/collaboration')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        hocuspocus.handleConnection(ws, request);
      });
    }
  });

  // Clean up on server shutdown
  app.addHook('onClose', async () => {
    hocuspocus.closeConnections();
    wss.close();
  });

  app.log.info('Hocuspocus collaboration server attached');
});
