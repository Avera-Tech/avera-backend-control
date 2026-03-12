import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: number;
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

/**
 * Middleware de autenticação JWT
 * Valida o token Bearer e adiciona os dados do usuário ao request
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  try {
    // 1. Extrair token do header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido',
      });
    }

    // 2. Verificar se JWT_SECRET existe
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET não definido no .env');
      return res.status(500).json({
        success: false,
        error: 'Erro de configuração do servidor',
      });
    }

    // 3. Verificar e decodificar o token
    const decoded = jwt.verify(token, secret) as TokenPayload;

    // 4. Adicionar dados do usuário ao request
    req.user = decoded;

    // 5. Continuar para a próxima função
    next();
  } catch (err: any) {
    // 6. Tratamento de erros específicos do JWT
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
