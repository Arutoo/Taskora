import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ok } from '../utils/response';
import * as activityLogService from '../services/activityLog.service';

export async function getLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await activityLogService.listLogs(req.params.id as string, page, limit);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}
