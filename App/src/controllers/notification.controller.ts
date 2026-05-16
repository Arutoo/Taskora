import { Response, NextFunction } from 'express';
import { AuthRequest, AppError } from '../types';
import { ok } from '../utils/response';
import * as notificationService from '../services/notification.service';

export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await notificationService.listNotifications(req.user.id, page, limit);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    await notificationService.markRead(req.params.id as string, req.user.id);
    ok(res, null, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    await notificationService.markAllRead(req.user.id);
    ok(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
}
