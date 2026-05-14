import { Response, NextFunction } from 'express';
import { AuthRequest, AppError } from '../types';
import { ok } from '../utils/response';
import * as userRepo from '../repositories/user.repository';

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const users = await userRepo.findAllUsers(search);
    ok(res, users);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userRepo.findUserById(req.params.id as string);
    if (!user) return next(new AppError('User not found', 404));
    ok(res, user);
  } catch (err) {
    next(err);
  }
}
