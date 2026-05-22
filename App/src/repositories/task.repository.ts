import { prisma } from '../utils/prisma';
import { Priority, TaskStatus } from '@prisma/client';

export async function createTask(data: {
  workspace_id: string;
  title: string;
  description?: string;
  priority: Priority;
  start_date?: Date;
  deadline?: Date;
  created_by: string;
  assigneeIds: string[];
}) {
  const { assigneeIds, ...taskData } = data;
  return prisma.task.create({
    data: {
      ...taskData,
      assignees: { create: assigneeIds.map((user_id) => ({ user_id })) },
    },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function findTasksByWorkspace(
  workspaceId: string,
  filters: { status?: TaskStatus; priority?: Priority; assigneeId?: string },
) {
  return prisma.task.findMany({
    where: {
      workspace_id: workspaceId,
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.assigneeId && { assignees: { some: { user_id: filters.assigneeId } } }),
    },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function findTaskById(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    priority?: Priority;
    start_date?: Date | null;
    deadline?: Date | null;
    assigneeIds?: string[];
  },
) {
  const { assigneeIds, ...taskData } = data;

  return prisma.$transaction(async (tx) => {
    if (assigneeIds !== undefined) {
      await tx.taskAssignee.deleteMany({ where: { task_id: id } });
      await tx.taskAssignee.createMany({
        data: assigneeIds.map((user_id) => ({ task_id: id, user_id })),
        skipDuplicates: true,
      });
    }

    return tx.task.update({
      where: { id },
      data: taskData,
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });
  });
}

export async function deleteTask(id: string) {
  return prisma.task.delete({ where: { id } });
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  return prisma.task.update({ where: { id }, data: { status } });
}

export async function verifyTask(id: string) {
  return prisma.task.update({ where: { id }, data: { is_verified: true } });
}

export async function unverifyTask(id: string) {
  return prisma.task.update({ where: { id }, data: { is_verified: false } });
}

export async function flagOverdueTasks(): Promise<string[]> {
  const now = new Date();
  const overdue = await prisma.task.findMany({
    where: {
      deadline: { lt: now },
      status: { not: TaskStatus.done },
      is_overdue: false,
    },
    select: { id: true, workspace_id: true },
  });

  if (overdue.length === 0) return [];

  await prisma.task.updateMany({
    where: { id: { in: overdue.map((t) => t.id) } },
    data: { is_overdue: true },
  });

  return overdue.map((t) => t.id);
}

export async function findTasksByWorkspaceCalendar(workspaceId: string) {
  return prisma.task.findMany({
    where: { workspace_id: workspaceId },
    select: {
      id: true,
      title: true,
      start_date: true,
      deadline: true,
      status: true,
      priority: true,
      is_overdue: true,
    },
    orderBy: { deadline: 'asc' },
  });
}

export async function isAssignee(taskId: string, userId: string): Promise<boolean> {
  const row = await prisma.taskAssignee.findUnique({
    where: { task_id_user_id: { task_id: taskId, user_id: userId } },
  });
  return row !== null;
}
