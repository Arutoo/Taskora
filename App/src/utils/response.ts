import { Response } from 'express';
import { ApiResponse } from '../types';

export function ok<T>(res: Response, data: T, message = 'Success'): void {
  const body: ApiResponse<T> = { success: true, data, message };
  res.status(200).json(body);
}

export function created<T>(res: Response, data: T, message = 'Created'): void {
  const body: ApiResponse<T> = { success: true, data, message };
  res.status(201).json(body);
}
