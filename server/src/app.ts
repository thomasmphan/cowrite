import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { errorHandler } from './shared/middleware/error-handler.js';
import prismaPlugin from './shared/plugins/prisma.js';
import { authRoutes } from './features/auth/auth.routes.js';
import { env } from './config/env.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      transport: env.nodeEnv !== 'production' ? { target: 'pino-pretty' } : undefined,
    },
  });

  app.setErrorHandler(errorHandler);

  app.register(prismaPlugin);
  app.register(fastifyJwt, { secret: env.jwt.secret });

  app.get('/health', async (request) => {
    await request.server.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  });

  app.register(authRoutes, { prefix: '/api/auth' });

  return app;
}
