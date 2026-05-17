import { prisma } from '../utils/prisma';
import { TaskStatus } from '@prisma/client';
import { emitToWorkspace } from '../utils/socketEmitter';

export async function run(): Promise<{ flagged: number; taskIds: string[] }> {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
    where: {
      deadline: { lt: now },
      status: { not: TaskStatus.done },
      is_overdue: false,
    },
    select: { id: true, workspace_id: true },
  });

  if (overdueTasks.length === 0) return { flagged: 0, taskIds: [] };

  const ids = overdueTasks.map((t) => t.id);

  await prisma.task.updateMany({
    where: { id: { in: ids } },
    data: { is_overdue: true },
  });

  for (const task of overdueTasks) {
    emitToWorkspace(task.workspace_id, 'task:overdue', { taskId: task.id });
  }

  return { flagged: overdueTasks.length, taskIds: ids };
}
