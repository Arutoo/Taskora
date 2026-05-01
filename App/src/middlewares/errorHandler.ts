import { Request, Response, NextFunction } from 'express';
import { AppError, ApiResponse } from '../types';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiResponse = { success: false, data: null, message: err.message };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiResponse = {
      success: false,
      data: null,
      message: err.errors.map((e) => e.message).join(', '),
    };
    res.status(400).json(body);
    return;
  }

  console.error(err);
  const body: ApiResponse = { success: false, data: null, message: 'Internal server error' };
  res.status(500).json(body);
}
