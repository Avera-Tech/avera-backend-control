import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  staffId: number;
  email: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET não definido no .env');
      return res.status(500).json({
        success: false,
        error: 'Erro de configuração do servidor',
      });
    }

    const decoded = jwt.verify(token, secret) as TokenPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        expired: true,
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        error: 'Token inválido',
      });
    }

    return res.status(403).json({
      success: false,
      error: 'Falha ao autenticar o token',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};
