import { Request, Response, NextFunction } from 'express';
import { sendError } from './responseHandler';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';
  return sendError(res, message, status, process.env.NODE_ENV === 'development' ? err.stack : undefined);
}
