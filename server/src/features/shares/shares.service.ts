import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { ForbiddenError, NotFoundError } from '../../shared/utils/errors.js';
import * as schema from '../../db/schema.js';

type ShareRole = (typeof schema.shareRoleEnum.enumValues)[number];

interface ShareResult {
  id: string;
  documentId: string;
  userId: string;
  role: ShareRole;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export class SharesService {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async share(
    documentId: string,
    ownerUserId: string,
    targetEmail: string,
    role: ShareRole,
  ): Promise<ShareResult> {
    const document = await this.db.query.documents.findFirst({
      where: eq(schema.documents.id, documentId),
    });

    if (!document || document.ownerId !== ownerUserId) {
      throw new NotFoundError('Document not found');
    }

    const targetUser = await this.db.query.users.findFirst({
      where: eq(schema.users.email, targetEmail),
    });

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    if (targetUser.id === ownerUserId) {
      throw new ForbiddenError('Cannot share a document with yourself');
    }

    const existing = await this.db.query.documentShares.findFirst({
      where: and(
        eq(schema.documentShares.documentId, documentId),
        eq(schema.documentShares.userId, targetUser.id),
      ),
    });

    if (existing) {
      throw new ForbiddenError('Document is already shared with this user');
    }

    const [share] = await this.db
      .insert(schema.documentShares)
      .values({ documentId, userId: targetUser.id, role })
      .returning();

    return {
      ...share,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.displayName,
      },
    };
  }

  async listByDocument(documentId: string, requestingUserId: string): Promise<ShareResult[]> {
    const document = await this.db.query.documents.findFirst({
      where: eq(schema.documents.id, documentId),
    });

    if (!document || document.ownerId !== requestingUserId) {
      throw new NotFoundError('Document not found');
    }

    return this.db.query.documentShares.findMany({
      where: eq(schema.documentShares.documentId, documentId),
      with: {
        user: {
          columns: { id: true, email: true, displayName: true },
        },
      },
    });
  }

  async updateRole(shareId: string, ownerUserId: string, role: ShareRole): Promise<ShareResult> {
    const share = await this.db.query.documentShares.findFirst({
      where: eq(schema.documentShares.id, shareId),
      with: { document: true },
    });

    if (!share || share.document.ownerId !== ownerUserId) {
      throw new NotFoundError('Share not found');
    }

    const [updated] = await this.db
      .update(schema.documentShares)
      .set({ role })
      .where(eq(schema.documentShares.id, shareId))
      .returning();

    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, updated.userId),
      columns: { id: true, email: true, displayName: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return { ...updated, user: user };
  }

  async revoke(shareId: string, ownerUserId: string): Promise<void> {
    const share = await this.db.query.documentShares.findFirst({
      where: eq(schema.documentShares.id, shareId),
      with: { document: true },
    });

    if (!share || share.document.ownerId !== ownerUserId) {
      throw new NotFoundError('Share not found');
    }

    await this.db.delete(schema.documentShares).where(eq(schema.documentShares.id, shareId));
  }
}
