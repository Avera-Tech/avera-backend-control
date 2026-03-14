import bcrypt from 'bcryptjs';
import OtpCode from '../models/OtpCode.model';
import { sendEmail } from '../../../shared/services/EmailService';

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export class OtpService {
  /**
   * Gera e envia um OTP de 6 dígitos para o email do usuário
   */
  static async sendOtp(
    userId: number,
    email: string,
    purpose: 'signup' | 'reset_password'
  ): Promise<void> {
    // Invalida OTPs anteriores do mesmo usuário e purpose
    await OtpCode.destroy({ where: { userId, purpose } });

    // Gera código de 6 dígitos
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);

    await OtpCode.create({
      userId,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      attempts: 0,
    });

    const subject =
      purpose === 'signup'
        ? `${code} é seu código de verificação`
        : `${code} é seu código de redefinição de senha`;

    const html = buildEmailHtml(code, purpose);

    await sendEmail(email, subject, html);
  }

  /**
   * Verifica se o OTP informado é válido
   */
  static async verifyOtp(
    userId: number,
    code: string,
    purpose: 'signup' | 'reset_password'
  ): Promise<{ success: boolean; error?: string }> {
    const otp = await OtpCode.findOne({
      where: { userId, purpose },
      order: [['createdAt', 'DESC']],
    });

    if (!otp) {
      return { success: false, error: 'Código não encontrado' };
    }

    if (otp.expiresAt < new Date()) {
      return { success: false, error: 'Código expirado' };
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      return { success: false, error: 'Número máximo de tentativas atingido' };
    }

    const isValid = await bcrypt.compare(code, otp.codeHash);

    // Incrementa tentativas independente do resultado
    await otp.update({ attempts: otp.attempts + 1 });

    if (!isValid) {
      return { success: false, error: 'Código inválido' };
    }

    // Invalida o OTP após uso bem-sucedido
    await otp.destroy();

    return { success: true };
  }
}

// ─── Template de email ───────────────────────────────────────────────────────

function buildEmailHtml(code: string, purpose: 'signup' | 'reset_password'): string {
  const title =
    purpose === 'signup'
      ? 'Verificação de conta'
      : 'Redefinição de senha';

  const description =
    purpose === 'signup'
      ? 'Use o código abaixo para verificar sua conta. Ele é válido por 10 minutos.'
      : 'Use o código abaixo para redefinir sua senha. Ele é válido por 10 minutos.';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 8px;">${title}</h1>
    <p style="color: #666; font-size: 15px; margin-bottom: 32px;">${description}</p>

    <div style="background: #f8f9fa; border: 2px solid #3b82f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
      <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #1a1a1a;">${code}</span>
    </div>

    <p style="color: #999; font-size: 13px;">Se você não solicitou isso, ignore este e-mail.</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #bbb; font-size: 11px; text-align: center;">
      Desenvolvido por <strong>Avera</strong>
    </p>
  </div>
</body>
</html>
  `.trim();
}