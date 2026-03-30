import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  json,
  customType,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

// --- Custom type for pgvector ---

const vector = customType<{ data: number[]; driverValue: string }>({
  dataType() {
    return 'vector(512)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    const str = value as string;
    return str.slice(1, -1).split(',').map(Number);
  },
});

// --- Enums ---

export const shareRoleEnum = pgEnum('ShareRole', ['EDITOR', 'VIEWER']);

// --- Tables ---

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(randomUUID),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(randomUUID),
  token: text('token').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { precision: 3 }).notNull(),
  createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
});

export const documents = pgTable(
  'documents',
  {
    id: text('id').primaryKey().$defaultFn(randomUUID),
    title: text('title').notNull().default('Untitled'),
    content: json('content').notNull().default({}),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ydoc: customType<{ data: Buffer }>({
      dataType() {
        return 'bytea';
      },
    })('ydoc'),
    contentHash: text('content_hash'),
  },
  (table) => [index('documents_owner_id_idx').on(table.ownerId)],
);

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: text('id').primaryKey().$defaultFn(randomUUID),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    embedding: vector('embedding').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    contentHash: text('content_hash').notNull(),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    index('document_chunks_document_id_idx').on(table.documentId),
    index('document_chunks_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

export const documentShares = pgTable(
  'document_shares',
  {
    id: text('id').primaryKey().$defaultFn(randomUUID),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: shareRoleEnum('role').notNull(),
    createdAt: timestamp('created_at', { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('document_shares_document_id_user_id_key').on(table.documentId, table.userId),
    index('document_shares_user_id_idx').on(table.userId),
  ],
);

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  documentShares: many(documentShares),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, { fields: [documents.ownerId], references: [users.id] }),
  shares: many(documentShares),
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, { fields: [documentChunks.documentId], references: [documents.id] }),
}));

export const documentSharesRelations = relations(documentShares, ({ one }) => ({
  document: one(documents, { fields: [documentShares.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentShares.userId], references: [users.id] }),
}));
