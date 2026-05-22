import { NotificationType, ReferenceType } from '@prisma/client';
import * as notificationRepo from '../repositories/notification.repository';
import * as userRepo from '../repositories/user.repository';
import { emitToUser } from '../utils/socketEmitter';
import { sendNotificationEmail } from '../utils/email';

export async function createAndPush(data: {
  user_id: string;
  type: NotificationType;
  message: string;
  reference_id?: string;
  reference_type?: ReferenceType;
}) {
  const notification = await notificationRepo.createNotification(data);
  emitToUser(data.user_id, 'notification:new', notification);

  // Fire-and-forget email — never block the main flow on email failure
  userRepo.findUserById(data.user_id)
    .then(user => { if (user) return sendNotificationEmail(user.email, data.message); })
    .catch(() => {});

  return notification;
}

export async function listNotifications(userId: string, page: number, limit: number) {
  return notificationRepo.findNotificationsByUser(userId, page, limit);
}

export async function markRead(notificationId: string, userId: string) {
  return notificationRepo.markOneRead(notificationId, userId);
}

export async function markAllRead(userId: string) {
  return notificationRepo.markAllRead(userId);
}
