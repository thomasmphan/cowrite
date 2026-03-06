import { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';

interface JwtPayload {
  sub: string;
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.userId = decoded.sub;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}
