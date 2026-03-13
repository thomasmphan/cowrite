import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { SharesService } from './shares.service.js';
import {
  ShareDocumentBodySchema,
  ShareDocumentBody,
  UpdateShareBodySchema,
  UpdateShareBody,
  ShareParamsSchema,
  ShareParams,
  ShareResponseSchema,
  ShareListResponseSchema,
} from './shares.schemas.js';
import { DocumentParamsSchema, DocumentParams } from '../documents/documents.schemas.js';

export async function shareRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authenticate);

  const sharesService = new SharesService(app.prisma);

  // POST /api/documents/:id/shares
  app.post<{ Params: DocumentParams; Body: ShareDocumentBody }>(
    '/',
    {
      schema: {
        params: DocumentParamsSchema,
        body: ShareDocumentBodySchema,
        response: { 201: ShareResponseSchema },
      },
    },
    async (request, reply) => {
      const share = await sharesService.share(
        request.params.id,
        request.userId,
        request.body.email,
        request.body.role,
      );
      return reply.status(201).send(share);
    },
  );

  // GET /api/documents/:id/shares
  app.get<{ Params: DocumentParams }>(
    '/',
    {
      schema: {
        params: DocumentParamsSchema,
        response: { 200: ShareListResponseSchema },
      },
    },
    async (request) => {
      return sharesService.listByDocument(request.params.id, request.userId);
    },
  );

  // PATCH /api/documents/:id/shares/:shareId
  app.patch<{ Params: ShareParams; Body: UpdateShareBody }>(
    '/:shareId',
    {
      schema: {
        params: ShareParamsSchema,
        body: UpdateShareBodySchema,
        response: { 200: ShareResponseSchema },
      },
    },
    async (request) => {
      return sharesService.updateRole(request.params.shareId, request.userId, request.body.role);
    },
  );

  // DELETE /api/documents/:id/shares/:shareId
  app.delete<{ Params: ShareParams }>(
    '/:shareId',
    {
      schema: {
        params: ShareParamsSchema,
      },
    },
    async (request, reply) => {
      await sharesService.revoke(request.params.shareId, request.userId);
      return reply.status(204).send();
    },
  );
}
