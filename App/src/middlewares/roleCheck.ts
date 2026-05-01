import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest, AppError } from '../types';

export function requireMember(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.workspaceRole) {
    return next(new AppError('Not a workspace member', 403));
  }
  next();
}

export function requireLeader(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (req.workspaceRole !== 'leader') {
    return next(new AppError('Leader access required', 403));
  }
  next();
}

export function loadWorkspaceRole(paramName = 'id') {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    const workspaceId = req.params[paramName] as string;
    const userId = req.user?.id;

    if (!userId || !workspaceId) {
      return next(new AppError('Unauthorized', 401));
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
    });

    if (!member) {
      return next(new AppError('Not a workspace member', 403));
    }

    req.workspaceRole = member.role;
    next();
  };
}
