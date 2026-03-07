import { Type, Static } from '@sinclair/typebox';

// --- Request schemas ---

export const RegisterBodySchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
  displayName: Type.String({ minLength: 1 }),
});

export type RegisterBody = Static<typeof RegisterBodySchema>;

export const LoginBodySchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 }),
});

export type LoginBody = Static<typeof LoginBodySchema>;

export const RefreshBodySchema = Type.Object({
  refreshToken: Type.String(),
});

export type RefreshBody = Static<typeof RefreshBodySchema>;

// --- Response schemas ---

export const AuthResponseSchema = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  user: Type.Object({
    id: Type.String(),
    email: Type.String(),
    displayName: Type.String(),
  }),
});

export type AuthResponse = Static<typeof AuthResponseSchema>;
