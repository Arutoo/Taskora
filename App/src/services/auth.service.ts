import { randomUUID } from 'crypto';
import { AppError } from '../types/index';
import { hashPassword, comparePassword, hashToken, compareToken } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import * as userRepo from '../repositories/user.repository';
import * as tokenRepo from '../repositories/refreshToken.repository';
import { sendVerificationEmail } from '../utils/email';

function refreshExpiryDate(): Date {
  const ms = 7 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

function verificationExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
}

export async function register(name: string, email: string, password: string) {
  const existing = await userRepo.findUserByEmail(email);

  if (existing) {
    if (existing.email_verified) throw new AppError('Email already registered', 409);

    const expired =
      !existing.verification_token_expires_at ||
      existing.verification_token_expires_at < new Date();

    if (!expired) {
      throw new AppError('Verification email already sent. Check your inbox or wait 24 hours to re-register.', 400);
    }

    // Expired unverified — overwrite
    const password_hash = await hashPassword(password);
    const token = randomUUID();
    const expiresAt = verificationExpiry();
    const user = await userRepo.overwriteUnverifiedUser(existing.id, { name, password_hash, token, expiresAt });
    await sendVerificationEmail(email, token);
    return user;
  }

  const password_hash = await hashPassword(password);
  const user = await userRepo.createUser({ name, email, password_hash });
  const token = randomUUID();
  await userRepo.setVerificationToken(user.id, token, verificationExpiry());
  await sendVerificationEmail(email, token);

  return user;
}

export async function login(email: string, password: string) {
  const user = await userRepo.findUserByEmail(email);
  if (!user) throw new AppError('Invalid email or password', 401);

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) throw new AppError('Invalid email or password', 401);

  if (!user.email_verified) throw new AppError('Email not verified. Check your inbox.', 403);

  const accessToken = signAccessToken({ userId: user.id, email: user.email, name: user.name });
  const refreshToken = signRefreshToken({ userId: user.id });
  const token_hash = await hashToken(refreshToken);

  await tokenRepo.createRefreshToken({
    token_hash,
    user_id: user.id,
    expires_at: refreshExpiryDate(),
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email },
  };
}

export async function refresh(rawRefreshToken: string) {
  const payload = verifyRefreshToken(rawRefreshToken);

  const activeTokens = await tokenRepo.findAllActiveByUserId(payload.userId);
  let matched: (typeof activeTokens)[number] | undefined;

  for (const t of activeTokens) {
    if (await compareToken(rawRefreshToken, t.token_hash)) {
      matched = t;
      break;
    }
  }

  if (!matched) throw new AppError('Refresh token revoked or not found', 403);

  const user = await userRepo.findUserById(payload.userId);
  if (!user) throw new AppError('User not found', 404);

  await tokenRepo.revokeToken(matched.id);

  const newAccess = signAccessToken({ userId: user.id, email: user.email, name: user.name });
  const newRefresh = signRefreshToken({ userId: user.id });
  const token_hash = await hashToken(newRefresh);

  await tokenRepo.createRefreshToken({
    token_hash,
    user_id: user.id,
    expires_at: refreshExpiryDate(),
  });

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function verifyEmail(token: string) {
  const user = await userRepo.findUserByVerificationToken(token);
  if (!user) throw new AppError('Invalid verification token', 400);
  if (user.email_verified) throw new AppError('Email already verified', 409);

  if (user.verification_token_expires_at && user.verification_token_expires_at < new Date()) {
    throw new AppError('Verification token expired. Please register again.', 400);
  }

  await userRepo.markEmailVerified(user.id);
  return { message: 'Email verified successfully' };
}

export async function logout(userId: string, rawRefreshToken: string) {
  const activeTokens = await tokenRepo.findAllActiveByUserId(userId);

  for (const t of activeTokens) {
    if (await compareToken(rawRefreshToken, t.token_hash)) {
      await tokenRepo.revokeToken(t.id);
      return;
    }
  }

  throw new AppError('Token not found or already revoked', 403);
}
