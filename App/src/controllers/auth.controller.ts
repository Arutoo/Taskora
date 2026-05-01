import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { ok, created } from '../utils/response';
import { AuthRequest, AppError } from '../types';

const ACCESS_TOKEN_TTL  = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge,
  };
}

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = registerSchema.parse(req.body);
    const user = await authService.register(body.name, body.email, body.password);
    created(res, user, 'User registered successfully');
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);

    res.cookie('accessToken', result.accessToken, cookieOptions(ACCESS_TOKEN_TTL));
    res.cookie('refreshToken', result.refreshToken, cookieOptions(REFRESH_TOKEN_TTL));

    ok(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = refreshSchema.parse(req.body);
    const token = req.cookies?.refreshToken ?? body.refreshToken;
    if (!token) return next(new AppError('Refresh token required', 400));

    const result = await authService.refresh(token);

    res.cookie('accessToken', result.accessToken, cookieOptions(ACCESS_TOKEN_TTL));
    res.cookie('refreshToken', result.refreshToken, cookieOptions(REFRESH_TOKEN_TTL));

    ok(res, result, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = logoutSchema.parse(req.body);
    if (!req.user) return next(new AppError('Unauthorized', 401));
    const token = req.cookies?.refreshToken ?? body.refreshToken;
    if (!token) return next(new AppError('Refresh token required', 400));

    await authService.logout(req.user.id, token);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    ok(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}
