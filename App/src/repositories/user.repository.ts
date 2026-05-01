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
