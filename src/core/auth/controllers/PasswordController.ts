import { Request, Response } from 'express';
import Joi from 'joi';
import User from '../../users/models/User.model';
import { OtpService } from '../services/OtpService';
import { PasswordService } from '../services/PasswordService';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const requestResetSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required().messages({
    'string.length': 'O código deve ter 6 dígitos',
    'any.required': 'Código é obrigatório',
  }),
  purpose: Joi.string().valid('signup', 'reset_password').required(),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).required().messages({
    'string.min': 'Senha deve ter no mínimo 8 caracteres',
    'any.required': 'Nova senha é obrigatória',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Senha atual é obrigatória',
  }),
  newPassword: Joi.string().min(8).required().messages({
    'string.min': 'Senha deve ter no mínimo 8 caracteres',
    'any.required': 'Nova senha é obrigatória',
  }),
  confirmPassword: Joi.string().optional(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class PasswordController {
  /**
   * POST /api/auth/request-reset
   * Envia OTP de reset de senha para o email
   */
  static async requestReset(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = requestResetSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const user = await User.findOne({
        where: { email: value.email.trim().toLowerCase() },
      });

      // Sempre retorna 200 para não revelar se o email existe
      if (!user || !user.active) {
        return res.status(200).json({
          success: true,
          message: 'Se o email existir, você receberá um código em breve.',
        });
      }

      await OtpService.sendOtp(user.id, user.email, 'reset_password');

      return res.status(200).json({
        success: true,
        message: 'Se o email existir, você receberá um código em breve.',
      });
    } catch (error: any) {
      console.error('Erro ao solicitar reset de senha:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * POST /api/auth/verify-otp
   * Verifica OTP (signup ou reset_password)
   */
  static async verifyOtp(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = verifyOtpSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const user = await User.findOne({
        where: { email: value.email.trim().toLowerCase() },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }

      const result = await OtpService.verifyOtp(user.id, value.code, value.purpose);

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      // Se for signup, ativa a conta
      if (value.purpose === 'signup') {
        user.emailVerified = true;
        user.active = true;
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message:
          value.purpose === 'signup'
            ? 'Conta verificada com sucesso'
            : 'Código verificado. Você pode redefinir sua senha.',
      });
    } catch (error: any) {
      console.error('Erro ao verificar OTP:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * POST /api/auth/reset-password
   * Redefine a senha após verificação do OTP
   */
  static async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const user = await User.findOne({
        where: { email: value.email.trim().toLowerCase() },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }

      // Verifica o OTP antes de resetar
      const otpResult = await OtpService.verifyOtp(user.id, value.code, 'reset_password');
      if (!otpResult.success) {
        return res.status(400).json({ success: false, error: otpResult.error });
      }

      // Redefine a senha
      const result = await PasswordService.resetPassword(user.id, value.newPassword);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      return res.status(200).json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * POST /api/auth/change-password
   * Troca de senha autenticada (precisa do token JWT)
   */
  static async changePassword(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const result = await PasswordService.changePassword(
        req.user.userId,
        value.currentPassword,
        value.newPassword,
        value.confirmPassword
      );

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      return res.status(200).json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao trocar senha:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * POST /api/auth/resend-otp
   * Reenvia o OTP para o email
   */
  static async resendOtp(req: Request, res: Response): Promise<Response> {
    try {
      const { email, purpose } = req.body;

      if (!email || !purpose) {
        return res.status(400).json({ success: false, error: 'Email e purpose são obrigatórios' });
      }

      const user = await User.findOne({
        where: { email: email.trim().toLowerCase() },
      });

      // Sempre retorna 200
      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'Se o email existir, você receberá um novo código em breve.',
        });
      }

      if (purpose === 'signup' && user.emailVerified) {
        return res.status(400).json({ success: false, error: 'Conta já verificada' });
      }

      await OtpService.sendOtp(user.id, user.email, purpose);

      return res.status(200).json({
        success: true,
        message: 'Se o email existir, você receberá um novo código em breve.',
      });
    } catch (error: any) {
      console.error('Erro ao reenviar OTP:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}