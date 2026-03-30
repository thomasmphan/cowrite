import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, or, and, inArray } from 'drizzle-orm';
import { ForbiddenError, NotFoundError } from '../../shared/utils/errors.js';
import * as schema from '../../db/schema.js';

interface DocumentResult {
  id: string;
  title: string;
  content: unknown;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentsService {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async create(ownerId: string, title?: string, content?: unknown): Promise<DocumentResult> {
    const [doc] = await this.db
      .insert(schema.documents)
      .values({
        ownerId,
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content: content as object }),
      })
      .returning();
    return doc;
  }

  async list(userId: string): Promise<DocumentResult[]> {
    return this.db.query.documents.findMany({
      where: or(
        eq(schema.documents.ownerId, userId),
        inArray(
          schema.documents.id,
          this.db
            .select({ id: schema.documentShares.documentId })
            .from(schema.documentShares)
            .where(eq(schema.documentShares.userId, userId)),
        ),
      ),
      orderBy: (documents, { desc }) => [desc(documents.updatedAt)],
    });
  }

  async getById(id: string, userId: string): Promise<DocumentResult> {
    const document = await this.db.query.documents.findFirst({
      where: eq(schema.documents.id, id),
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    if (document.ownerId === userId) {
      return document;
    }

    const share = await this.db.query.documentShares.findFirst({
      where: and(
        eq(schema.documentShares.documentId, id),
        eq(schema.documentShares.userId, userId),
      ),
    });

    if (!share) {
      throw new NotFoundError('Document not found');
    }

    return document;
  }

  async update(
    id: string,
    userId: string,
    data: { title?: string; content?: unknown },
  ): Promise<DocumentResult> {
    const document = await this.db.query.documents.findFirst({
      where: eq(schema.documents.id, id),
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    if (document.ownerId !== userId) {
      const share = await this.db.query.documentShares.findFirst({
        where: and(
          eq(schema.documentShares.documentId, id),
          eq(schema.documentShares.userId, userId),
        ),
      });

      if (!share) {
        throw new NotFoundError('Document not found');
      }

      if (share.role !== 'EDITOR') {
        throw new ForbiddenError('You do not have permission to edit this document');
      }
    }

    const [updated] = await this.db
      .update(schema.documents)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content as object }),
      })
      .where(eq(schema.documents.id, id))
      .returning();

    return updated;
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const document = await this.db.query.documents.findFirst({
      where: eq(schema.documents.id, id),
    });

    if (!document || document.ownerId !== ownerId) {
      throw new NotFoundError('Document not found');
    }

    await this.db.delete(schema.documents).where(eq(schema.documents.id, id));
  }
}
