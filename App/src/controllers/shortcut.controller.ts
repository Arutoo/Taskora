import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, AppError } from '../types';
import { ok, created } from '../utils/response';
import * as shortcutService from '../services/shortcut.service';

const createSchema = z.object({
  label: z.string().min(1).max(100),
  url: z.string().url(),
});

export async function addShortcut(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const body = createSchema.parse(req.body);
    const shortcut = await shortcutService.addShortcut(req.params.id as string, req.user.id, body.label, body.url);
    created(res, shortcut, 'Shortcut added');
  } catch (err) {
    next(err);
  }
}

export async function listShortcuts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const shortcuts = await shortcutService.listShortcuts(req.params.id as string);
    ok(res, shortcuts);
  } catch (err) {
    next(err);
  }
}

export async function deleteShortcut(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    await shortcutService.removeShortcut(req.params.sid as string, req.user.id, req.workspaceRole ?? 'member');
    ok(res, null, 'Shortcut deleted');
  } catch (err) {
    next(err);
  }
}
