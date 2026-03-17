import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { ConflictError, UnauthorizedError } from '../../shared/utils/errors.js';
import { env } from '../../config/env.js';

const SALT_ROUNDS = 12;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UserPayload {
  id: string;
  email: string;
  displayName: string;
}

interface AuthResult {
  user: UserPayload;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly signToken: (
      payload: Record<string, unknown>,
      options?: { expiresIn: string },
    ) => string,
  ) {}

  async register(email: string, password: string, displayName: string): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: { email, passwordHash, displayName },
    });

    const tokens = await this.generateTokens(user.id);

    return {
      user: { id: user.id, email: user.email, displayName: user.displayName },
      ...tokens,
    };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id);

    return {
      user: { id: user.id, email: user.email, displayName: user.displayName },
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Delete the old token (rotation - each refresh token is single-use)
    try {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    } catch {
      // Token already consumed by a concurrent request
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokens = await this.generateTokens(stored.userId);

    return {
      user: {
        id: stored.user.id,
        email: stored.user.email,
        displayName: stored.user.displayName,
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  private async generateTokens(userId: string): Promise<TokenPair> {
    const accessToken = this.signToken({ sub: userId }, { expiresIn: env.jwt.expiresIn });

    const refreshToken = randomBytes(40).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseDays(env.jwt.refreshExpiresIn));

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}

function parseDays(duration: string): number {
  const match = duration.match(/^(\d+)d$/);
  return match ? Number(match[1]) : 7;
}
