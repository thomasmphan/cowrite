import { env } from './config/env.js';
import { buildApp } from './app.js';

const app = buildApp();

const start = async (): Promise<void> => {
  await app.listen({ port: env.port, host: '0.0.0.0' });
};

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
