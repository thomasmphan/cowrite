import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { errorHandler } from './shared/middleware/error-handler.js';
import prismaPlugin from './shared/plugins/prisma.js';
import hocuspocusPlugin from './features/collaboration/hocuspocus.js';
import { authRoutes } from './features/auth/auth.routes.js';
import { documentRoutes } from './features/documents/documents.routes.js';
import { shareRoutes } from './features/shares/shares.routes.js';
import { env } from './config/env.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      transport: env.nodeEnv !== 'production' ? { target: 'pino-pretty' } : undefined,
    },
  });

  app.setErrorHandler(errorHandler);

  // Infrastructure plugins (no dependencies)
  app.register(prismaPlugin);
  app.register(fastifyJwt, { secret: env.jwt.secret });
  app.register(fastifyCookie);

  // Feature plugins (hocuspocus depends on prismaPlugin for DB access)
  app.register(hocuspocusPlugin);

  app.get('/health', async (request) => {
    await request.server.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  });

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(documentRoutes, { prefix: '/api/documents' });
  app.register(shareRoutes, { prefix: '/api/documents/:id/shares' });

  return app;
}
