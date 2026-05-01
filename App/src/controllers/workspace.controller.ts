import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, AppError } from '../types';
import { ok, created } from '../utils/response';
import * as workspaceService from '../services/workspace.service';

const createSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
});

const inviteSchema = z.object({
  email: z.string().email().optional(),
});

const joinSchema = z.object({
  token: z.string(),
});

export async function createWorkspace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const body = createSchema.parse(req.body);
    const ws = await workspaceService.createWorkspace(req.user.id, body.name, body.description);
    created(res, ws, 'Workspace created');
  } catch (err) {
    next(err);
  }
}

export async function listWorkspaces(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const workspaces = await workspaceService.listWorkspaces(req.user.id);
    ok(res, workspaces);
  } catch (err) {
    next(err);
  }
}

export async function getWorkspace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ws = await workspaceService.getWorkspace(req.params.id as string);
    ok(res, ws);
  } catch (err) {
    next(err);
  }
}

export async function updateWorkspace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateSchema.parse(req.body);
    const ws = await workspaceService.updateWorkspace(req.params.id as string, body);
    ok(res, ws, 'Workspace updated');
  } catch (err) {
    next(err);
  }
}

export async function archiveWorkspace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ws = await workspaceService.archiveWorkspace(req.params.id as string);
    ok(res, ws, 'Workspace archived');
  } catch (err) {
    next(err);
  }
}

export async function invite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const body = inviteSchema.parse(req.body);

    if (body.email) {
      // Invite by email — lookup + add directly
      const result = await workspaceService.inviteByEmail(req.params.id as string, req.user.id, body.email);
      ok(res, result, 'User added to workspace');
    } else {
      const token = await workspaceService.generateInviteLink(req.params.id as string, req.user.id);
      ok(res, { inviteToken: token }, 'Invite link generated');
    }
  } catch (err) {
    next(err);
  }
}

export async function joinWorkspace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const body = joinSchema.parse(req.body);
    const ws = await workspaceService.joinViaToken(body.token, req.user.id);
    ok(res, ws, 'Joined workspace successfully');
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    await workspaceService.removeMember(req.params.id as string, req.params.userId as string, req.user.id);
    ok(res, null, 'Member removed');
  } catch (err) {
    next(err);
  }
}
