import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import {
  RegisterBodySchema,
  RegisterBody,
  LoginBodySchema,
  LoginBody,
  RefreshBodySchema,
  RefreshBody,
  AuthResponseSchema,
} from './auth.schemas.js';

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
      return reply.status(201).send(result);
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
    async (request) => {
      const { email, password } = request.body;
      return authService.login(email, password);
    },
  );

  // POST /api/auth/refresh
  app.post<{ Body: RefreshBody }>(
    '/refresh',
    {
      schema: {
        body: RefreshBodySchema,
        response: { 200: AuthResponseSchema },
      },
    },
    async (request) => {
      const { refreshToken } = request.body;
      return authService.refresh(refreshToken);
    },
  );

  // POST /api/auth/logout
  app.post<{ Body: RefreshBody }>(
    '/logout',
    {
      schema: {
        body: RefreshBodySchema,
      },
    },
    async (request) => {
      const { refreshToken } = request.body;
      await authService.logout(refreshToken);
      return { message: 'Logged out' };
    },
  );
}
