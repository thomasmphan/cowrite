import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import * as schema from '../../db/schema.js';

export default fp(async (app: FastifyInstance) => {
  const pool = new pg.Pool({ connectionString: env.database.url });
  const db = drizzle(pool, { schema });

  // Verify connectivity
  await pool.query('SELECT 1');
  app.log.info('Connected to database');

  app.decorate('db', db);

  app.addHook('onClose', async () => {
    await pool.end();
    app.log.info('Disconnected from database');
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    db: NodePgDatabase<typeof schema>;
  }
}
