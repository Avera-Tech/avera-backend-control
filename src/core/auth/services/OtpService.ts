import bcrypt from 'bcryptjs';
import OtpCode from '../models/OtpCode.model';
import { sendEmail } from '../../../shared/services/EmailService';

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export class OtpService {
  static async sendOtp(staffId: number, email: string): Promise<void> {
    await OtpCode.destroy({ where: { staffId, purpose: 'reset_password' } });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);

    await OtpCode.create({
      staffId,
      purpose: 'reset_password',
      codeHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      attempts: 0,
    });

    await sendEmail(email, `${code} é seu código de redefinição de senha`, buildEmailHtml(code));
  }

  static async verifyOtp(
    staffId: number,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    const otp = await OtpCode.findOne({
      where: { staffId, purpose: 'reset_password' },
      order: [['createdAt', 'DESC']],
    });

    if (!otp) return { success: false, error: 'Código não encontrado' };
    if (otp.expiresAt < new Date()) return { success: false, error: 'Código expirado' };
    if (otp.attempts >= MAX_ATTEMPTS) return { success: false, error: 'Número máximo de tentativas atingido' };

    const isValid = await bcrypt.compare(code, otp.codeHash);
    await otp.update({ attempts: otp.attempts + 1 });

    if (!isValid) return { success: false, error: 'Código inválido' };

    await otp.destroy();
    return { success: true };
  }
}

function buildEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Redefinição de senha</title></head>
<body style="font-family:sans-serif;background:#f4f5f7;padding:40px 0;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <div style="background:#2b5aad;padding:32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;">Avera CT</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1c2a4a;">Redefinição de senha</h2>
      <p style="color:#6b7a94;">Use o código abaixo para redefinir sua senha. Expira em 10 minutos.</p>
      <div style="background:#f4f5f7;border-radius:10px;padding:20px;text-align:center;margin:24px 0;">
        <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#2b5aad;">${code}</span>
      </div>
      <p style="color:#6b7a94;font-size:13px;">Se não solicitou, ignore este email.</p>
    </div>
  </div>
</body>
</html>`;
}
