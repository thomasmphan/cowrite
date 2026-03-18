import { Type, Static } from '@sinclair/typebox';

// --- Request schemas ---

export const CreateDocumentBodySchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  content: Type.Optional(Type.Unknown()),
});

export type CreateDocumentBody = Static<typeof CreateDocumentBodySchema>;

export const UpdateDocumentBodySchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  content: Type.Optional(Type.Unknown()),
});

export type UpdateDocumentBody = Static<typeof UpdateDocumentBodySchema>;

export const DocumentParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export type DocumentParams = Static<typeof DocumentParamsSchema>;

// --- Response schemas ---

const DocumentSchema = Type.Object({
  id: Type.String(),
  title: Type.String(),
  content: Type.Unknown(),
  ownerId: Type.String(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export const DocumentResponseSchema = DocumentSchema;
export const DocumentListResponseSchema = Type.Array(DocumentSchema);
