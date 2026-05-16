import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { Priority, TaskStatus } from '@prisma/client';
import { AuthRequest, AppError } from '../types';
import { ok, created } from '../utils/response';
import * as taskService from '../services/task.service';

const priorityEnum = z.nativeEnum(Priority);
const statusEnum = z.nativeEnum(TaskStatus);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: priorityEnum,
  start_date: z.string().datetime({ offset: true }).optional(),
  deadline: z.string().datetime({ offset: true }).optional(),
  assigneeIds: z.array(z.string().uuid()).min(1),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: priorityEnum.optional(),
  start_date: z.string().datetime({ offset: true }).nullable().optional(),
  deadline: z.string().datetime({ offset: true }).nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
});

const statusSchema = z.object({
  status: statusEnum,
});

export async function createTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const body = createSchema.parse(req.body);
    const task = await taskService.createTask(req.params.id as string, req.user.id, {
      ...body,
      start_date: body.start_date ? new Date(body.start_date) : undefined,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
    });
    created(res, task, 'Task created');
  } catch (err) {
    next(err);
  }
}

export async function listTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, priority, assigneeId } = req.query as Record<string, string | undefined>;
    const tasks = await taskService.listTasks(req.params.id as string, { status, priority, assigneeId });
    ok(res, tasks);
  } catch (err) {
    next(err);
  }
}

export async function getTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const task = await taskService.getTask(req.params.taskId as string, req.params.id as string);
    ok(res, task);
  } catch (err) {
    next(err);
  }
}

export async function editTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateSchema.parse(req.body);
    const task = await taskService.editTask(
      req.params.taskId as string,
      {
        ...body,
        start_date: body.start_date !== undefined ? (body.start_date ? new Date(body.start_date) : null) : undefined,
        deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : undefined,
      },
      req.params.id as string,
    );
    ok(res, task, 'Task updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await taskService.deleteTask(req.params.taskId as string, req.params.id as string);
    ok(res, null, 'Task deleted');
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const { status } = statusSchema.parse(req.body);
    const task = await taskService.updateStatus(
      req.params.taskId as string,
      req.user.id,
      status,
      req.params.id as string,
    );
    ok(res, task, 'Status updated');
  } catch (err) {
    next(err);
  }
}

export async function verifyTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const task = await taskService.verifyTask(
      req.params.taskId as string,
      req.user.id,
      req.params.id as string,
    );
    ok(res, task, 'Task verified');
  } catch (err) {
    next(err);
  }
}

export async function getCalendar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const calendar = await taskService.getCalendar(req.params.id as string);
    ok(res, calendar);
  } catch (err) {
    next(err);
  }
}
