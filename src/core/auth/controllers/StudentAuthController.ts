import { Request, Response } from 'express';
import Joi from 'joi';
import { StudentAuthService } from '../services/StudentAuthService';

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'any.required': 'Nome é obrigatório',
    'string.min': 'Nome deve ter no mínimo 2 caracteres',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Senha deve ter no mínimo 6 caracteres',
    'any.required': 'Senha é obrigatória',
  }),
  phone: Joi.string().max(20).optional().allow(null, ''),
  document: Joi.string().max(14).optional().allow(null, ''),
  birthday: Joi.string().isoDate().optional().allow(null, ''),
  height: Joi.number().positive().optional().allow(null),
  weight: Joi.number().positive().optional().allow(null),
  address: Joi.string().max(200).optional().allow(null, ''),
  city: Joi.string().max(100).optional().allow(null, ''),
  state: Joi.string().length(2).optional().allow(null, ''),
  zipCode: Joi.string().max(10).optional().allow(null, ''),
});

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

export class StudentAuthController {
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const result = await StudentAuthService.login(value.email, value.password, req.tenantDb);

      if (!result.success) {
        return res.status(401).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Erro no login do aluno:', error);
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

      const payload = StudentAuthService.verifyToken(refreshToken);
      if (!payload || !payload.studentId) {
        return res.status(401).json({ success: false, error: 'Refresh token inválido ou expirado' });
      }

      const newToken = StudentAuthService.generateAuthToken({
        studentId: payload.studentId,
        email: payload.email,
      });

      return res.status(200).json({
        success: true,
        token: newToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      });
    } catch (error: any) {
      console.error('Erro ao renovar token do aluno:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async register(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const result = await StudentAuthService.register(value, req.tenantDb);

      if (!result.success) {
        return res.status(409).json(result);
      }

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro no cadastro do aluno:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  static async me(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.student) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const student = await req.tenantDb.ClientUser.findOne({
        where: { id: req.student.studentId },
        attributes: ['id', 'name', 'email', 'phone', 'document', 'birthday', 'height', 'weight', 'levelId', 'address', 'city', 'state', 'zipCode', 'active'],
      });

      if (!student) {
        return res.status(404).json({ success: false, error: 'Aluno não encontrado' });
      }

      return res.status(200).json({ success: true, student });
    } catch (error: any) {
      console.error('Erro ao buscar aluno:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}
