import { Request, Response } from 'express';
import Joi from 'joi';
import User from '../../users/models/User.model';
import { PasswordService } from '../services/PasswordService';
import { OtpService } from '../services/OtpService';
import { sendEmail } from '../../../shared/services/EmailService';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const requestResetSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token é obrigatório',
  }),
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

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required().messages({
    'string.length': 'O código deve ter 6 dígitos',
    'any.required': 'Código é obrigatório',
  }),
  purpose: Joi.string().valid('signup', 'reset_password').required(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class PasswordController {
  /**
   * POST /api/auth/request-reset
   * Gera token JWT e envia link de reset por email
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
          message: 'Se o email existir, você receberá um link em breve.',
        });
      }

      // Gera token JWT de reset (1h)
      const resetToken = PasswordService.generateResetToken(user.id, user.email);
      const resetLink = PasswordService.buildResetLink(resetToken);

      // Envia email com o link
      const html = buildResetEmailHtml(user.name, resetLink);
      await sendEmail(user.email, 'Redefinição de senha', html);

      return res.status(200).json({
        success: true,
        message: 'Se o email existir, você receberá um link em breve.',
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
   * POST /api/auth/reset-password
   * Redefine senha via token do link
   */
  static async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const result = await PasswordService.resetPassword(value.token, value.newPassword);

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
   * Troca de senha autenticada
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
   * POST /api/auth/verify-otp
   * Verifica OTP de signup
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

      // Ativa a conta se for signup
      if (value.purpose === 'signup') {
        user.emailVerified = true;
        user.active = true;
        await user.save();

        // Envia email de boas-vindas
        await sendEmail(
          user.email,
          'Bem-vindo ao TennisUP! 🎾',
          buildWelcomeEmailHtml(user.name)
        );
      }

      return res.status(200).json({
        success: true,
        message:
          value.purpose === 'signup'
            ? 'Conta verificada com sucesso'
            : 'Código verificado com sucesso',
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
   * POST /api/auth/resend-otp
   * Reenvia OTP de signup
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

// ─── Templates de email ──────────────────────────────────────────────────────

const brandColor = '#2b5aad';
const accentColor = '#e9a319';
const bgColor = '#f4f5f7';
const cardBg = '#ffffff';
const textColor = '#1c2a4a';
const mutedText = '#6b7a94';

function buildResetEmailHtml(name: string, resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinição de senha</title>
</head>
<body style="font-family: 'Inter', sans-serif; background-color: ${bgColor}; margin: 0; padding: 40px 0;">
  <div style="max-width: 480px; margin: 0 auto; background-color: ${cardBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background-color: ${brandColor}; padding: 32px 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px;">
        Tennis<span style="color: ${accentColor};">UP</span>
      </h1>
    </div>
    <!-- Body -->
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${textColor};">Redefinir sua senha</h2>
      <p style="margin: 0 0 8px; font-size: 15px; color: ${mutedText}; line-height: 1.6;">
        Olá, <strong>${name}</strong>!
      </p>
      <p style="margin: 0 0 24px; font-size: 15px; color: ${mutedText}; line-height: 1.6;">
        Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
      </p>
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="${resetLink}"
           style="display: inline-block; background-color: ${brandColor}; color: #fff; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
          Redefinir senha
        </a>
      </div>
      <p style="margin: 0 0 16px; font-size: 13px; color: ${mutedText}; line-height: 1.5;">
        Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este email.
      </p>
      <div style="background-color: ${bgColor}; border-radius: 8px; padding: 12px 16px;">
        <p style="margin: 0; font-size: 12px; color: ${mutedText}; word-break: break-all;">
          ${resetLink}
        </p>
      </div>
    </div>
    <!-- Footer -->
    <div style="border-top: 1px solid #e8eaed; padding: 20px 32px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #a0aab8;">
        © 2025 TennisUP · Desenvolvido por <strong style="color: ${mutedText};">Avera</strong>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function buildWelcomeEmailHtml(name: string): string {
  const brandColor = '#2b5aad';
  const accentColor = '#e9a319';
  const bgColor = '#f4f5f7';
  const cardBg = '#ffffff';
  const textColor = '#1c2a4a';
  const mutedText = '#6b7a94';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bem-vindo ao TennisUP!</title>
</head>
<body style="font-family: 'Inter', sans-serif; background-color: ${bgColor}; margin: 0; padding: 40px 0;">
  <div style="max-width: 480px; margin: 0 auto; background-color: ${cardBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background-color: ${brandColor}; padding: 32px 32px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px;">
        Tennis<span style="color: ${accentColor};">UP</span>
      </h1>
    </div>
    <!-- Body -->
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${textColor};">Bem-vindo ao TennisUP! 🎾</h2>
      <p style="margin: 0 0 8px; font-size: 15px; color: ${mutedText}; line-height: 1.6;">
        Olá, <strong>${name}</strong>!
      </p>
      <p style="margin: 0 0 20px; font-size: 15px; color: ${mutedText}; line-height: 1.6;">
        Sua conta foi criada e verificada com sucesso. Estamos felizes em ter você conosco!
      </p>
      <ul style="margin: 0 0 24px; padding: 0 0 0 20px; font-size: 14px; color: ${mutedText}; line-height: 2;">
        <li>📅 Gerenciar agendamentos de quadras</li>
        <li>👥 Controlar alunos e professores</li>
        <li>📊 Acompanhar relatórios e métricas</li>
        <li>💳 Gerenciar pagamentos e mensalidades</li>
      </ul>
      <p style="margin: 0; font-size: 13px; color: ${mutedText};">
        Se tiver alguma dúvida, estamos à disposição para ajudar.
      </p>
    </div>
    <!-- Footer -->
    <div style="border-top: 1px solid #e8eaed; padding: 20px 32px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #a0aab8;">
        © 2025 TennisUP · Desenvolvido por <strong style="color: ${mutedText};">Avera</strong>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}