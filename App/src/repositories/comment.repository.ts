import { prisma } from '../utils/prisma';

const USER_SELECT = { id: true, name: true, email: true };

export async function createComment(data: {
  task_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
}) {
  return prisma.comment.create({
    data,
    include: { user: { select: USER_SELECT } },
  });
}

export async function findCommentById(id: string) {
  return prisma.comment.findUnique({
    where: { id },
    include: { user: { select: USER_SELECT } },
  });
}

export async function findCommentsByTask(taskId: string) {
  return prisma.comment.findMany({
    where: { task_id: taskId, parent_id: null },
    include: {
      user: { select: USER_SELECT },
      replies: { include: { user: { select: USER_SELECT } }, orderBy: { created_at: 'asc' } },
    },
    orderBy: { created_at: 'asc' },
  });
}

export async function updateComment(id: string, content: string) {
  return prisma.comment.update({
    where: { id },
    data: { content },
    include: { user: { select: USER_SELECT } },
  });
}

export async function deleteComment(id: string) {
  return prisma.comment.delete({ where: { id } });
}
