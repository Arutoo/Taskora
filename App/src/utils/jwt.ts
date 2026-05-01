import jwt from 'jsonwebtoken';
import { AppError } from '../types';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const INVITE_JWT_SECRET = process.env.INVITE_JWT_SECRET!;
const JWT_EXPIRY = process.env.JWT_EXPIRY ?? '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

export interface InviteTokenPayload {
  workspaceId: string;
  invitedBy: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as jwt.SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY } as jwt.SignOptions);
}

export function signInviteToken(payload: InviteTokenPayload): string {
  return jwt.sign(payload, INVITE_JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
  } catch {
    throw new AppError('Invalid or expired access token', 401);
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 403);
  }
}

export function verifyInviteToken(token: string): InviteTokenPayload {
  try {
    return jwt.verify(token, INVITE_JWT_SECRET) as InviteTokenPayload;
  } catch {
    throw new AppError('Invalid or expired invite token', 401);
  }
}
