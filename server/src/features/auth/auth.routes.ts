import { FastifyInstance, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import {
  RegisterBodySchema,
  RegisterBody,
  LoginBodySchema,
  LoginBody,
  AuthResponseSchema,
} from './auth.schemas.js';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../shared/utils/errors.js';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function setRefreshTokenCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function clearRefreshTokenCookie(reply: FastifyReply): void {
  reply.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const authService = new AuthService(app.prisma, (payload, options) =>
    app.jwt.sign(payload, options),
  );

  // POST /api/auth/register
  app.post<{ Body: RegisterBody }>(
    '/register',
    {
      schema: {
        body: RegisterBodySchema,
        response: { 201: AuthResponseSchema },
      },
    },
    async (request, reply) => {
      const { email, password, displayName } = request.body;
      const result = await authService.register(email, password, displayName);
      setRefreshTokenCookie(reply, result.refreshToken);
      return reply.status(201).send({
        accessToken: result.accessToken,
        user: result.user,
      });
    },
  );

  // POST /api/auth/login
  app.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: {
        body: LoginBodySchema,
        response: { 200: AuthResponseSchema },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const result = await authService.login(email, password);
      setRefreshTokenCookie(reply, result.refreshToken);
      return reply.send({
        accessToken: result.accessToken,
        user: result.user,
      });
    },
  );

  // POST /api/auth/refresh
  app.post(
    '/refresh',
    {
      schema: {
        response: { 200: AuthResponseSchema },
      },
    },
    async (request, reply) => {
      const token = request.cookies[REFRESH_TOKEN_COOKIE];
      if (!token) {
        throw new UnauthorizedError('No refresh token');
      }
      const result = await authService.refresh(token);
      setRefreshTokenCookie(reply, result.refreshToken);
      return reply.send({
        accessToken: result.accessToken,
        user: result.user,
      });
    },
  );

  // POST /api/auth/logout
  app.post('/logout', async (request, reply) => {
    const token = request.cookies[REFRESH_TOKEN_COOKIE];
    if (token) {
      await authService.logout(token);
    }
    clearRefreshTokenCookie(reply);
    return reply.send({ message: 'Logged out' });
  });
}
