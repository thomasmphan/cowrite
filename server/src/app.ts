import Fastify from 'fastify';
import { errorHandler } from './shared/middleware/error-handler.js';

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

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  return app;
}
