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

const brandColor = '#2b5aad';
const accentColor = '#e9a319';
const bgColor = '#f4f5f7';
const cardBg = '#ffffff';
const textColor = '#1c2a4a';
const mutedText = '#6b7a94';

function buildEmailHtml(code: string, purpose: 'signup' | 'reset_password'): string {
  const title =
    purpose === 'signup'
      ? 'Verifique sua conta'
      : 'Redefinição de senha';

  const description =
    purpose === 'signup'
      ? 'Use o código abaixo para verificar sua conta no TennisUP. O código expira em 10 minutos.'
      : 'Use o código abaixo para redefinir sua senha. O código expira em 10 minutos.';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
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
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: ${textColor};">${title}</h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: ${mutedText}; line-height: 1.6;">
        ${description}
      </p>
      <div style="background-color: ${bgColor}; border-radius: 10px; padding: 20px; text-align: center; margin: 0 0 24px;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: ${brandColor}; font-family: 'JetBrains Mono', monospace;">
          ${code}
        </span>
      </div>
      <p style="margin: 0 0 8px; font-size: 13px; color: ${mutedText}; line-height: 1.5;">
        Se você não solicitou este código, ignore este email.
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