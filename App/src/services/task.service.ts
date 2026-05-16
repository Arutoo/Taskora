import { Priority, TaskStatus, ReferenceType, NotificationType } from '@prisma/client';
import { AppError } from '../types';
import * as taskRepo from '../repositories/task.repository';
import * as workspaceRepo from '../repositories/workspace.repository';
import * as notificationService from './notification.service';
import * as activityLogService from './activityLog.service';
import { emitToWorkspace } from '../utils/socketEmitter';

export async function createTask(
  workspaceId: string,
  createdBy: string,
  data: {
    title: string;
    description?: string;
    priority: Priority;
    start_date?: Date;
    deadline?: Date;
    assigneeIds: string[];
  },
) {
  for (const uid of data.assigneeIds) {
    const m = await workspaceRepo.findMember(workspaceId, uid);
    if (!m) throw new AppError(`User ${uid} is not a workspace member`, 400);
  }

  const task = await taskRepo.createTask({ workspace_id: workspaceId, created_by: createdBy, ...data });

  await activityLogService.log({
    workspace_id: workspaceId,
    user_id: createdBy,
    action_type: 'task_created',
    reference_id: task.id,
    reference_type: ReferenceType.task,
  });

  for (const uid of data.assigneeIds) {
    await notificationService.createAndPush({
      user_id: uid,
      type: NotificationType.task_assigned,
      message: `You have been assigned to task: ${task.title}`,
      reference_id: task.id,
      reference_type: ReferenceType.task,
    });
  }

  emitToWorkspace(workspaceId, 'task:updated', { taskId: task.id, changes: task });

  return task;
}

export async function listTasks(
  workspaceId: string,
  filters: { status?: string; priority?: string; assigneeId?: string },
) {
  const overdueIds = await taskRepo.flagOverdueTasks();
  for (const taskId of overdueIds) {
    const task = await taskRepo.findTaskById(taskId);
    if (task) emitToWorkspace(task.workspace_id, 'task:overdue', { taskId });
  }

  return taskRepo.findTasksByWorkspace(workspaceId, {
    status: filters.status as TaskStatus | undefined,
    priority: filters.priority as Priority | undefined,
    assigneeId: filters.assigneeId,
  });
}

export async function getTask(taskId: string, workspaceId: string) {
  const task = await taskRepo.findTaskById(taskId);
  if (!task || task.workspace_id !== workspaceId) throw new AppError('Task not found', 404);
  return task;
}

export async function editTask(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: Priority;
    start_date?: Date | null;
    deadline?: Date | null;
    assigneeIds?: string[];
  },
  workspaceId: string,
) {
  const task = await taskRepo.findTaskById(taskId);
  if (!task || task.workspace_id !== workspaceId) throw new AppError('Task not found', 404);

  if (data.assigneeIds) {
    for (const uid of data.assigneeIds) {
      const m = await workspaceRepo.findMember(workspaceId, uid);
      if (!m) throw new AppError(`User ${uid} is not a workspace member`, 400);
    }
  }

  const updated = await taskRepo.updateTask(taskId, data);
  emitToWorkspace(workspaceId, 'task:updated', { taskId, changes: updated });
  return updated;
}

export async function deleteTask(taskId: string, workspaceId: string) {
  const task = await taskRepo.findTaskById(taskId);
  if (!task || task.workspace_id !== workspaceId) throw new AppError('Task not found', 404);
  return taskRepo.deleteTask(taskId);
}

export async function updateStatus(taskId: string, userId: string, status: TaskStatus, workspaceId: string) {
  const task = await taskRepo.findTaskById(taskId);
  if (!task || task.workspace_id !== workspaceId) throw new AppError('Task not found', 404);

  if (task.is_verified) throw new AppError('Cannot change status of a verified task', 403);

  const isAssignee = await taskRepo.isAssignee(taskId, userId);
  if (!isAssignee) throw new AppError('Only assigned members can update task status', 403);

  const updatedTask = await taskRepo.updateTaskStatus(taskId, status);

  await activityLogService.log({
    workspace_id: workspaceId,
    user_id: userId,
    action_type: 'status_changed',
    reference_id: taskId,
    reference_type: ReferenceType.task,
  });

  emitToWorkspace(workspaceId, 'task:updated', { taskId, changes: { status } });

  const ws = await workspaceRepo.findWorkspaceById(workspaceId);
  if (ws) {
    for (const m of ws.members) {
      if (m.user_id !== userId) {
        await notificationService.createAndPush({
          user_id: m.user_id,
          type: NotificationType.status_changed,
          message: `Task "${task.title}" status changed to ${status}`,
          reference_id: taskId,
          reference_type: ReferenceType.task,
        });
      }
    }
  }

  return updatedTask;
}

export async function verifyTask(taskId: string, leaderId: string, workspaceId: string) {
  const task = await taskRepo.findTaskById(taskId);
  if (!task || task.workspace_id !== workspaceId) throw new AppError('Task not found', 404);
  if (task.status !== TaskStatus.done) throw new AppError('Task must be done before verifying', 400);
  if (task.is_verified) throw new AppError('Task already verified', 409);

  const updated = await taskRepo.verifyTask(taskId);

  await activityLogService.log({
    workspace_id: workspaceId,
    user_id: leaderId,
    action_type: 'task_verified',
    reference_id: taskId,
    reference_type: ReferenceType.task,
  });

  for (const a of task.assignees) {
    await notificationService.createAndPush({
      user_id: a.user_id,
      type: NotificationType.task_verified,
      message: `Your task "${task.title}" has been verified`,
      reference_id: taskId,
      reference_type: ReferenceType.task,
    });
  }

  emitToWorkspace(workspaceId, 'task:updated', { taskId, changes: { is_verified: true } });
  return updated;
}

export async function getCalendar(workspaceId: string) {
  return taskRepo.findTasksByWorkspaceCalendar(workspaceId);
}
