import { PrismaClient } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../shared/utils/errors.js';

interface DocumentResult {
  id: string;
  title: string;
  content: unknown;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(ownerId: string, title?: string, content?: unknown): Promise<DocumentResult> {
    return this.prisma.document.create({
      data: {
        ownerId,
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content: content as object }),
      },
    });
  }

  async list(userId: string): Promise<DocumentResult[]> {
    return this.prisma.document.findMany({
      where: {
        OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getById(id: string, userId: string): Promise<DocumentResult> {
    const document = await this.prisma.document.findUnique({ where: { id } });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    if (document.ownerId === userId) {
      return document;
    }

    const share = await this.prisma.documentShare.findUnique({
      where: { documentId_userId: { documentId: id, userId } },
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
    const document = await this.prisma.document.findUnique({ where: { id } });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    if (document.ownerId !== userId) {
      const share = await this.prisma.documentShare.findUnique({
        where: { documentId_userId: { documentId: id, userId } },
      });

      if (!share) {
        throw new NotFoundError('Document not found');
      }

      if (share.role !== 'EDITOR') {
        throw new ForbiddenError('You do not have permission to edit this document');
      }
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content as object }),
      },
    });
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const document = await this.prisma.document.findUnique({ where: { id } });

    if (!document || document.ownerId !== ownerId) {
      throw new NotFoundError('Document not found');
    }

    await this.prisma.document.delete({ where: { id } });
  }
}
