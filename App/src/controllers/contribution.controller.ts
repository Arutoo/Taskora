import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ok } from '../utils/response';
import * as contributionService from '../services/contribution.service';

export async function getContributions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await contributionService.getSummary(req.params.id as string);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}
