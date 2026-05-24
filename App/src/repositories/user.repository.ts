import { prisma } from '../utils/prisma';

export async function createUser(data: { name: string; email: string; password_hash: string }) {
  return prisma.user.create({
    data,
    select: { id: true, name: true, email: true, created_at: true },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, created_at: true },
  });
}

export async function userExistsByEmail(email: string): Promise<boolean> {
  const count = await prisma.user.count({ where: { email } });
  return count > 0;
}

export async function setVerificationToken(userId: string, token: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { verification_token: token },
  });
}

export async function findUserByVerificationToken(token: string) {
  return prisma.user.findFirst({ where: { verification_token: token } });
}

export async function markEmailVerified(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { email_verified: true, verification_token: null },
  });
}

export async function findAllUsers(search?: string) {
  return prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: { id: true, name: true, email: true, created_at: true },
    orderBy: { name: 'asc' },
  });
}
