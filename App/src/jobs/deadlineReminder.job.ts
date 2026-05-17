import { prisma } from '../utils/prisma';
import { TaskStatus, NotificationType, ReferenceType } from '@prisma/client';
import { emitToUser } from '../utils/socketEmitter';
import * as notificationRepo from '../repositories/notification.repository';

const WINDOWS = [
  { hoursLeft: 24, marginMinutes: 30 },
  { hoursLeft: 1,  marginMinutes: 10 },
];

export async function run(): Promise<{ notified: number }> {
  const now = new Date();
  let notified = 0;

  for (const { hoursLeft, marginMinutes } of WINDOWS) {
    const lower = new Date(now.getTime() + (hoursLeft * 60 - marginMinutes) * 60 * 1000);
    const upper = new Date(now.getTime() + (hoursLeft * 60 + marginMinutes) * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        deadline: { gte: lower, lte: upper },
        status: { not: TaskStatus.done },
        is_verified: false,
      },
      include: { assignees: { select: { user_id: true } } },
    });

    for (const task of tasks) {
      for (const assignee of task.assignees) {
        const notification = await notificationRepo.createNotification({
          user_id: assignee.user_id,
          type: NotificationType.deadline_reminder,
          message: `Task "${task.title}" is due in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`,
          reference_id: task.id,
          reference_type: ReferenceType.task,
        });

        emitToUser(assignee.user_id, 'notification:new', notification);
        emitToUser(assignee.user_id, 'deadline:reminder', { taskId: task.id, hoursLeft });
        notified++;
      }
    }
  }

  return { notified };
}
