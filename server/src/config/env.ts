import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env['PORT']) || 3000,
  nodeEnv: process.env['NODE_ENV'] || 'development',
  database: {
    url: requireEnv('DATABASE_URL'),
  },
  jwt: {
    secret: process.env['JWT_SECRET'] || '',
    expiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
  },
  cors: {
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
  },
} as const;
