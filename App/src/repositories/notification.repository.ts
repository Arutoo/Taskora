import { prisma } from '../utils/prisma';
import { NotificationType, ReferenceType } from '@prisma/client';

export async function createNotification(data: {
  user_id: string;
  type: NotificationType;
  message: string;
  reference_id?: string;
  reference_type?: ReferenceType;
}) {
  return prisma.notification.create({ data });
}

export async function findNotificationsByUser(
  userId: string,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { user_id: userId } }),
  ]);
  return { items, total, page, limit };
}

export async function markOneRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, user_id: userId },
    data: { is_read: true },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });
}
