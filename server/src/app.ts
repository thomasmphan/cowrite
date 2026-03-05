import Fastify, { FastifyInstance } from 'fastify';
import { errorHandler } from './shared/middleware/error-handler.js';
import prismaPlugin from './shared/plugins/prisma.js';
import { env } from './config/env.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      transport: env.nodeEnv !== 'production' ? { target: 'pino-pretty' } : undefined,
    },
  });

  app.setErrorHandler(errorHandler);

  app.register(prismaPlugin);

  app.get('/health', async (request) => {
    await request.server.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  });

  return app;
}
