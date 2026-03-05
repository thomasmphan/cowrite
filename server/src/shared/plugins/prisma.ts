import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';

export default fp(async (app: FastifyInstance) => {
  const pool = new pg.Pool({ connectionString: env.database.url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();
  app.log.info('Connected to database');

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
    app.log.info('Disconnected from database');
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
