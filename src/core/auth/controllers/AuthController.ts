import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import Joi from 'joi';

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

export class AuthController {
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const result = await AuthService.login(value.email, value.password);

      if (!result.success) {
        return res.status(401).json(result);
      }

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

  static async refresh(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, error: 'Refresh token não fornecido' });
      }

      const payload = AuthService.verifyToken(refreshToken);
      if (!payload) {
        return res.status(401).json({ success: false, error: 'Refresh token inválido ou expirado' });
      }

      const newToken = AuthService.generateAuthToken({
        staffId: payload.staffId,
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

  static async me(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }
      return res.status(200).json({ success: true, user: req.user });
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
