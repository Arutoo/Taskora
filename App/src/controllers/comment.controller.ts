import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, AppError } from '../types';
import { ok, created } from '../utils/response';
import * as commentService from '../services/comment.service';

const postSchema = z.object({
  content: z.string().min(1),
  parent_id: z.string().uuid().optional(),
});

const editSchema = z.object({
  content: z.string().min(1),
});

export async function postComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const body = postSchema.parse(req.body);
    const comment = await commentService.postComment(
      req.params.taskId as string,
      req.user.id,
      body.content,
      body.parent_id,
    );
    created(res, comment, 'Comment posted');
  } catch (err) {
    next(err);
  }
}

export async function listComments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const comments = await commentService.listComments(req.params.taskId as string);
    ok(res, comments);
  } catch (err) {
    next(err);
  }
}

export async function editComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const { content } = editSchema.parse(req.body);
    const comment = await commentService.editComment(req.params.id as string, req.user.id, content);
    ok(res, comment, 'Comment updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    await commentService.deleteComment(req.params.id as string, req.user.id, req.workspaceRole ?? 'member');
    ok(res, null, 'Comment deleted');
  } catch (err) {
    next(err);
  }
}
