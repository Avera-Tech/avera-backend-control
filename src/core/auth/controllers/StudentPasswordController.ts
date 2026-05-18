/**
 * src/core/auth/controllers/StudentPasswordController.ts
 *
 * Controller HTTP para reset de senha de alunos.
 *
 * POST /app/v1/auth/request-reset  → envia email com link
 * POST /app/v1/auth/reset-password → recebe token + nova senha
 */

import { Request, Response } from 'express';
import Joi from 'joi';
import { StudentPasswordService } from '../services/StudentPasswordService';
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

// ─── Controller ───────────────────────────────────────────────────────────────

export class StudentPasswordController {
  /**
   * POST /app/v1/auth/request-reset
   *
   * O clientId vem do header X-Client-Id (já validado pelo resolveTenant).
   * O link gerado segue o padrão:
   *   http://localhost:8080/{clientId}/reset-senha?token=xxxxx
   */
  static async requestReset(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = requestResetSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      // Slug do tenant — injetado pelo resolveTenant via header X-Client-Id
      const clientId = req.headers['x-client-id'] as string;

      const { ClientUser } = req.tenantDb;
      const normalizedEmail = value.email.trim().toLowerCase();

      const student = await ClientUser.findOne({ where: { email: normalizedEmail } });

      // Sempre retorna sucesso — não vaza se o email existe
      if (!student?.active) {
        return res.status(200).json({
          success: true,
          message: 'Se o email existir, você receberá um link em breve.',
        });
      }

      const resetToken = StudentPasswordService.generateResetToken(student.id, student.email);

      // Link com slug do tenant: http://localhost:8080/avera-sports/reset-senha?token=xxx
      const resetLink = StudentPasswordService.buildResetLink(resetToken, clientId);

      await sendEmail(
        student.email,
        'Redefinição de senha',
        buildResetEmailHtml(student.name, resetLink),
      );

      return res.status(200).json({
        success: true,
        message: 'Se o email existir, você receberá um link em breve.',
      });
    } catch (error: any) {
      console.error('Erro ao solicitar reset de senha do aluno:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * POST /app/v1/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const result = await StudentPasswordService.resetPassword(
        value.token,
        value.newPassword,
        req.tenantDb,
      );

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      return res.status(200).json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error: any) {
      console.error('Erro ao redefinir senha do aluno:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

// ─── Template de email ────────────────────────────────────────────────────────

function buildResetEmailHtml(name: string, resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Redefinição de senha</title></head>
<body style="font-family:sans-serif;background:#f4f5f7;padding:40px 0;margin:0;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

    <div style="background:#2b5aad;padding:32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">Avera</h1>
    </div>

    <div style="padding:32px;">
      <h2 style="color:#1c2a4a;margin-top:0;">Redefinir senha</h2>
      <p style="color:#6b7a94;line-height:1.6;">
        Olá, <strong style="color:#1c2a4a;">${name}</strong>!<br/>
        Recebemos uma solicitação para redefinir a senha da sua conta.
        Clique no botão abaixo para criar uma nova senha.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a
          href="${resetLink}"
          style="background:#2b5aad;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;"
        >
          Redefinir senha
        </a>
      </div>

      <p style="color:#6b7a94;font-size:13px;line-height:1.6;">
        Este link expira em <strong>1 hora</strong>.<br/>
        Se você não solicitou a redefinição, pode ignorar este email com segurança.
      </p>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

      <p style="color:#aab0bc;font-size:12px;">
        Se o botão não funcionar, copie e cole este link no seu navegador:<br/>
        <span style="color:#2b5aad;word-break:break-all;">${resetLink}</span>
      </p>
    </div>
  </div>
</body>
</html>`;
}