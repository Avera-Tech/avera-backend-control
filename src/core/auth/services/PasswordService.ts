import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Staff from '../../staff/models/Staff.model';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,}$/;

const RESET_TOKEN_EXPIRY = '1h';
const FRONTEND_RESET_URL =
  process.env.FRONTEND_RESET_URL || 'http://localhost:5173/reset-password?token=';

export class PasswordService {
  static validateStrength(password: string): boolean {
    return PASSWORD_REGEX.test(password);
  }

  static generateResetToken(staffId: number, email: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado');
    return jwt.sign(
      { staffId, email, type: 'password_reset' },
      secret,
      { expiresIn: RESET_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'] }
    );
  }

  static verifyResetToken(token: string): { staffId: number; email: string } | null {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET não configurado');
      const decoded = jwt.verify(token, secret) as any;
      if (decoded.type !== 'password_reset') return null;
      return { staffId: decoded.staffId, email: decoded.email };
    } catch {
      return null;
    }
  }

  static buildResetLink(token: string): string {
    return `${FRONTEND_RESET_URL}${token}`;
  }

  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const payload = this.verifyResetToken(token);
    if (!payload) {
      return { success: false, error: 'Link inválido ou expirado' };
    }

    if (!this.validateStrength(newPassword)) {
      return {
        success: false,
        error: 'Senha fraca. Use no mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.',
      };
    }

    const staff = await Staff.findOne({
      where: { id: payload.staffId, email: payload.email },
    });

    if (!staff) return { success: false, error: 'Usuário não encontrado' };
    if (!staff.active) return { success: false, error: 'Conta desativada' };

    staff.password = await bcrypt.hash(newPassword, 10);
    await staff.save();

    return { success: true };
  }

  static async changePassword(
    staffId: number,
    currentPassword: string,
    newPassword: string,
    confirmPassword?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (confirmPassword && newPassword !== confirmPassword) {
      return { success: false, error: 'A confirmação de senha não confere' };
    }

    if (!this.validateStrength(newPassword)) {
      return {
        success: false,
        error: 'Senha fraca. Use no mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.',
      };
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff) return { success: false, error: 'Usuário não encontrado' };

    const passwordMatch = await bcrypt.compare(currentPassword, staff.password);
    if (!passwordMatch) return { success: false, error: 'Senha atual incorreta' };

    staff.password = await bcrypt.hash(newPassword, 10);
    await staff.save();

    return { success: true };
  }
}
