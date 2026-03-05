import Fastify from 'fastify';
import { errorHandler } from './shared/middleware/error-handler.js';
import prismaPlugin from './shared/plugins/prisma.js';

export function buildApp() {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
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
