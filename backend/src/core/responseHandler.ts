import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message: string = 'Sucesso', statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(res: Response, error: string = 'Erro interno do servidor', statusCode: number = 500, details?: any) {
  return res.status(statusCode).json({
    success: false,
    error,
    details,
  });
}
