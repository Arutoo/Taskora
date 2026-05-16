import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { ok } from '../utils/response';
import * as overdueJob from '../jobs/overdue.job';
import * as deadlineReminderJob from '../jobs/deadlineReminder.job';

function verifyCronSecret(req: Request): void {
  const secret = req.headers['x-cron-secret'] ?? req.headers.authorization?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    throw new AppError('Unauthorized cron request', 401);
  }
}

export async function checkOverdue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifyCronSecret(req);
    const result = await overdueJob.run();
    ok(res, result, 'Overdue check complete');
  } catch (err) {
    next(err);
  }
}

export async function checkDeadlineReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    verifyCronSecret(req);
    const result = await deadlineReminderJob.run();
    ok(res, result, 'Deadline reminder check complete');
  } catch (err) {
    next(err);
  }
}
