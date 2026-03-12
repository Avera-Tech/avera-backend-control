import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import Joi from 'joi';

/**
 * Validação do schema de login
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Senha deve ter no mínimo 6 caracteres',
    'any.required': 'Senha é obrigatória',
  }),
});

/**
 * Validação do schema de registro
 */
const registerSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Nome deve ter no mínimo 3 caracteres',
    'string.max': 'Nome deve ter no máximo 100 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Senha deve ter no mínimo 8 caracteres',
      'string.pattern.base':
        'Senha deve conter letras maiúsculas, minúsculas, números e símbolos',
      'any.required': 'Senha é obrigatória',
    }),
});

/**
 * Controller de Autenticação
 */
export class AuthController {
  /**
   * POST /auth/login
   * Realiza login do usuário
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      // 1. Validar dados
      const { error, value } = loginSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const { email, password } = value;

      // 2. Chamar serviço de autenticação
      const result = await AuthService.login(email, password);

      if (!result.success) {
        return res.status(401).json(result);
      }

      // 3. Retornar sucesso
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro no login:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * POST /auth/register
   * Registra novo usuário
   */
  static async register(req: Request, res: Response): Promise<Response> {
    try {
      // 1. Validar dados
      const { error, value } = registerSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const { name, email, password } = value;

      // 2. Chamar serviço de registro
      const result = await AuthService.register(name, email, password);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // 3. Retornar sucesso
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro no registro:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * POST /auth/refresh
   * Renova o token de autenticação
   */
  static async refresh(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token não fornecido',
        });
      }

      // Verificar refresh token
      const payload = AuthService.verifyToken(refreshToken);

      if (!payload) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token inválido ou expirado',
        });
      }

      // Gerar novo token
      const newToken = AuthService.generateAuthToken({
        userId: payload.userId,
        email: payload.email,
      });

      return res.status(200).json({
        success: true,
        token: newToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      });
    } catch (error: any) {
      console.error('Erro ao renovar token:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET /auth/me
   * Retorna dados do usuário autenticado
   */
  static async me(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Não autenticado',
        });
      }

      return res.status(200).json({
        success: true,
        user: req.user,
      });
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}
