import { prisma } from '../db/prisma.js';
import { generateOpaqueToken, sha256 } from '../utils/hash.js';

const parseRefreshTtlDays = (): number => {
  const envValue = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';
  const match = envValue.match(/^(\d+)d$/);
  if (!match) {
    return 30;
  }
  return Number(match[1]);
};

export const issueRefreshToken = async (userId: string): Promise<string> => {
  const rawToken = generateOpaqueToken(48);
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parseRefreshTtlDays());

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return rawToken;
};

export const rotateRefreshToken = async (rawToken: string): Promise<{ userId: string; newRawToken: string } | null> => {
  const tokenHash = sha256(rawToken);
  const token = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!token || token.revokedAt || token.expiresAt < new Date() || token.user.status !== 'ACTIVE') {
    return null;
  }

  await prisma.refreshToken.update({
    where: { tokenHash },
    data: { revokedAt: new Date() }
  });

  const newRawToken = await issueRefreshToken(token.userId);
  return { userId: token.userId, newRawToken };
};

export const revokeRefreshToken = async (rawToken: string): Promise<void> => {
  const tokenHash = sha256(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() }
  });
};
