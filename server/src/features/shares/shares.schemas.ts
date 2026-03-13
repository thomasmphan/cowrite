import { Type, Static } from '@sinclair/typebox';
import {} from '../documents/documents.schemas.js';

// --- Request schemas ---

export const ShareDocumentBodySchema = Type.Object({
  email: Type.String({ format: 'email' }),
  role: Type.Union([Type.Literal('EDITOR'), Type.Literal('VIEWER')]),
});

export type ShareDocumentBody = Static<typeof ShareDocumentBodySchema>;

export const UpdateShareBodySchema = Type.Object({
  role: Type.Union([Type.Literal('EDITOR'), Type.Literal('VIEWER')]),
});

export type UpdateShareBody = Static<typeof ShareDocumentBodySchema>;

export const ShareParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  shareId: Type.String({ format: 'uuid' }),
});

export type ShareParams = Static<typeof ShareParamsSchema>;

// --- Response schemas ---

const ShareUserSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  displayName: Type.String(),
});

const ShareSchema = Type.Object({
  id: Type.String(),
  documentId: Type.String(),
  userId: Type.String(),
  role: Type.String(),
  createdAt: Type.String(),
  user: ShareUserSchema,
});

export const ShareResponseSchema = ShareSchema;
export const ShareListResponseSchema = Type.Array(ShareSchema);
