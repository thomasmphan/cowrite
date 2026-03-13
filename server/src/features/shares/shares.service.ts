import { PrismaClient, ShareRole } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../shared/utils/errors.js';

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
  constructor(private readonly prisma: PrismaClient) {}

  async share(
    documentId: string,
    ownerUserId: string,
    targetEmail: string,
    role: ShareRole,
  ): Promise<ShareResult> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.ownerId !== ownerUserId) {
      throw new NotFoundError('Document not found');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    if (targetUser.id === ownerUserId) {
      throw new ForbiddenError('Cannot share a document with yourself');
    }

    const existing = await this.prisma.documentShare.findUnique({
      where: { documentId_userId: { documentId, userId: targetUser.id } },
    });

    if (existing) {
      throw new ForbiddenError('Document is already shared with this user');
    }

    return this.prisma.documentShare.create({
      data: { documentId, userId: targetUser.id, role },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
  }

  async listByDocument(documentId: string, requestingUserId: string): Promise<ShareResult[]> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.ownerId !== requestingUserId) {
      throw new NotFoundError('Document not found');
    }

    return this.prisma.documentShare.findMany({
      where: { documentId },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
  }

  async updateRole(shareId: string, ownerUserId: string, role: ShareRole): Promise<ShareResult> {
    const share = await this.prisma.documentShare.findUnique({
      where: { id: shareId },
      include: { document: true },
    });

    if (!share || share.document.ownerId !== ownerUserId) {
      throw new NotFoundError('Share not found');
    }

    return this.prisma.documentShare.update({
      where: { id: shareId },
      data: { role },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
  }

  async revoke(shareId: string, ownerUserId: string): Promise<void> {
    const share = await this.prisma.documentShare.findUnique({
      where: { id: shareId },
      include: { document: true },
    });

    if (!share || share.document.ownerId !== ownerUserId) {
      throw new NotFoundError('Share not found');
    }

    await this.prisma.documentShare.delete({ where: { id: shareId } });
  }
}
