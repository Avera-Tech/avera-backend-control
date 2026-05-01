import { Request, Response } from 'express';
import Joi from 'joi';
import { PasswordService } from '../services/PasswordService';
import { sendEmail } from '../../../shared/services/EmailService';

const requestResetSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({ 'any.required': 'Token é obrigatório' }),
  newPassword: Joi.string().min(8).required().messages({
    'string.min': 'Senha deve ter no mínimo 8 caracteres',
    'any.required': 'Nova senha é obrigatória',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({ 'any.required': 'Senha atual é obrigatória' }),
  newPassword: Joi.string().min(8).required().messages({
    'string.min': 'Senha deve ter no mínimo 8 caracteres',
    'any.required': 'Nova senha é obrigatória',
  }),
  confirmPassword: Joi.string().optional(),
});

export class PasswordController {
  static async requestReset(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = requestResetSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const { Staff } = req.tenantDb;
      const staff = await Staff.findOne({
        where: { email: value.email.trim().toLowerCase() },
      });

      if (!staff?.active) {
        return res.status(200).json({
          success: true,
          message: 'Se o email existir, você receberá um link em breve.',
        });
      }

      const resetToken = PasswordService.generateResetToken(staff.id, staff.email);
      const resetLink = PasswordService.buildResetLink(resetToken);
      await sendEmail(staff.email, 'Redefinição de senha', buildResetEmailHtml(staff.name, resetLink));

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

  static async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const result = await PasswordService.resetPassword(value.token, value.newPassword, req.tenantDb);
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

  static async changePassword(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user?.staffId) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const result = await PasswordService.changePassword(
        req.user.staffId,
        value.currentPassword,
        value.newPassword,
        req.tenantDb,
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
}

// ─── Email templates ──────────────────────────────────────────────────────────

function buildResetEmailHtml(name: string, resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Redefinição de senha</title></head>
<body style="font-family:sans-serif;background:#f4f5f7;padding:40px 0;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <div style="background:#2b5aad;padding:32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;">Avera CT</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1c2a4a;">Redefinir senha</h2>
      <p style="color:#6b7a94;">Olá, <strong>${name}</strong>! Clique no botão abaixo para criar uma nova senha.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetLink}" style="background:#2b5aad;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">
          Redefinir senha
        </a>
      </div>
      <p style="color:#6b7a94;font-size:13px;">Este link expira em 1 hora. Se não solicitou, ignore este email.</p>
    </div>
  </div>
</body>
</html>`;
}
