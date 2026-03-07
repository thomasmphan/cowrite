import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { DocumentsService } from './documents.service.js';
import {
  CreateDocumentBodySchema,
  CreateDocumentBody,
  UpdateDocumentBodySchema,
  UpdateDocumentBody,
  DocumentParamsSchema,
  DocumentParams,
  DocumentResponseSchema,
  DocumentListResponseSchema,
} from './documents.schemas.js';

export async function documentRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authenticate);

  const documentsService = new DocumentsService(app.prisma);

  app.post<{ Body: CreateDocumentBody }>(
    '/',
    {
      schema: {
        body: CreateDocumentBodySchema,
        response: { 201: DocumentResponseSchema },
      },
    },
    async (request, reply) => {
      const doc = await documentsService.create(
        request.userId,
        request.body.title,
        request.body.content,
      );
      return reply.status(201).send(doc);
    },
  );

  app.get(
    '/',
    {
      schema: {
        response: { 200: DocumentListResponseSchema },
      },
    },
    async (request) => {
      return documentsService.list(request.userId);
    },
  );

  app.get<{ Params: DocumentParams }>(
    '/:id',
    {
      schema: {
        params: DocumentParamsSchema,
        response: { 200: DocumentResponseSchema },
      },
    },
    async (request) => {
      return documentsService.getById(request.params.id, request.userId);
    },
  );

  app.patch<{ Params: DocumentParams; Body: UpdateDocumentBody }>(
    '/:id',
    {
      schema: {
        params: DocumentParamsSchema,
        body: UpdateDocumentBodySchema,
        response: { 200: DocumentResponseSchema },
      },
    },
    async (request) => {
      return documentsService.update(request.params.id, request.userId, request.body);
    },
  );

  app.delete<{ Params: DocumentParams }>(
    '/:id',
    {
      schema: {
        params: DocumentParamsSchema,
      },
    },
    async (request, reply) => {
      await documentsService.delete(request.params.id, request.userId);
      return reply.status(204).send();
    },
  );
}
