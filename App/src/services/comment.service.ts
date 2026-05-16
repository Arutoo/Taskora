import { ReferenceType, NotificationType } from '@prisma/client';
import { AppError } from '../types';
import * as commentRepo from '../repositories/comment.repository';
import * as notificationService from './notification.service';
import * as activityLogService from './activityLog.service';
import { prisma } from '../utils/prisma';

async function getWorkspaceIdFromTask(taskId: string): Promise<string> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { workspace_id: true } });
  if (!task) throw new AppError('Task not found', 404);
  return task.workspace_id;
}

export async function postComment(
  taskId: string,
  userId: string,
  content: string,
  parentId?: string,
) {
  if (parentId) {
    const parent = await commentRepo.findCommentById(parentId);
    if (!parent) throw new AppError('Parent comment not found', 404);
    if (parent.parent_id !== null) throw new AppError('Cannot reply to a reply', 400);
  }

  const comment = await commentRepo.createComment({
    task_id: taskId,
    user_id: userId,
    content,
    parent_id: parentId,
  });

  const workspaceId = await getWorkspaceIdFromTask(taskId);

  await activityLogService.log({
    workspace_id: workspaceId,
    user_id: userId,
    action_type: 'comment_added',
    reference_id: comment.id,
    reference_type: ReferenceType.comment,
  });

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: { select: { user_id: true } } },
  });

  if (task) {
    if (!parentId) {
      for (const a of task.assignees) {
        if (a.user_id !== userId) {
          await notificationService.createAndPush({
            user_id: a.user_id,
            type: NotificationType.commented,
            message: `New comment on a task you are assigned to`,
            reference_id: taskId,
            reference_type: ReferenceType.task,
          });
        }
      }
    } else {
      const parent = await commentRepo.findCommentById(parentId);
      if (parent && parent.user_id !== userId) {
        await notificationService.createAndPush({
          user_id: parent.user_id,
          type: NotificationType.replied,
          message: `Someone replied to your comment`,
          reference_id: comment.id,
          reference_type: ReferenceType.comment,
        });
      }
    }
  }

  return comment;
}

export async function listComments(taskId: string) {
  return commentRepo.findCommentsByTask(taskId);
}

export async function editComment(commentId: string, userId: string, content: string) {
  const comment = await commentRepo.findCommentById(commentId);
  if (!comment) throw new AppError('Comment not found', 404);
  if (comment.user_id !== userId) throw new AppError("Cannot edit another user's comment", 403);
  return commentRepo.updateComment(commentId, content);
}

export async function deleteComment(
  commentId: string,
  userId: string,
  workspaceRole: 'leader' | 'member',
) {
  const comment = await commentRepo.findCommentById(commentId);
  if (!comment) throw new AppError('Comment not found', 404);
  if (comment.user_id !== userId && workspaceRole !== 'leader') {
    throw new AppError('Not authorized to delete this comment', 403);
  }
  return commentRepo.deleteComment(commentId);
}
