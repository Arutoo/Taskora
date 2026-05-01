import { prisma } from '../utils/prisma';

export async function createRefreshToken(data: {
  token_hash: string;
  user_id: string;
  expires_at: Date;
}) {
  return prisma.refreshToken.create({ data });
}

export async function findActiveTokenByUserId(userId: string) {
  return prisma.refreshToken.findFirst({
    where: { user_id: userId, is_revoked: false, expires_at: { gt: new Date() } },
    orderBy: { created_at: 'desc' },
  });
}

export async function findAllActiveByUserId(userId: string) {
  return prisma.refreshToken.findMany({
    where: { user_id: userId, is_revoked: false, expires_at: { gt: new Date() } },
  });
}

export async function revokeToken(id: string) {
  return prisma.refreshToken.update({ where: { id }, data: { is_revoked: true } });
}

export async function revokeAllByUserId(userId: string) {
  return prisma.refreshToken.updateMany({
    where: { user_id: userId, is_revoked: false },
    data: { is_revoked: true },
  });
}
