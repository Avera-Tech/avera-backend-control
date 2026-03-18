import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../users/models/User.model';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,}$/;

const RESET_TOKEN_EXPIRY = '1h';
const FRONTEND_RESET_URL =
  process.env.FRONTEND_RESET_URL || 'http://localhost:5173/reset-password?token=';

export class PasswordService {
  /**
   * Valida a força da senha
   */
  static validateStrength(password: string): boolean {
    return PASSWORD_REGEX.test(password);
  }

  /**
   * Gera um token JWT de reset de senha (expira em 1h)
   */
  static generateResetToken(userId: number, email: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado');

    return jwt.sign(
      { userId, email, type: 'password_reset' },
      secret,
      { expiresIn: RESET_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'] }
    );
  }

  /**
   * Verifica e decodifica o token de reset
   */
  static verifyResetToken(
    token: string
  ): { userId: number; email: string } | null {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET não configurado');

      const decoded = jwt.verify(token, secret) as any;

      if (decoded.type !== 'password_reset') return null;

      return { userId: decoded.userId, email: decoded.email };
    } catch {
      return null;
    }
  }

  /**
   * Gera o link completo de reset para enviar no email
   */
  static buildResetLink(token: string): string {
    return `${FRONTEND_RESET_URL}${token}`;
  }

  /**
   * Redefine a senha do usuário via token de reset
   */
  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Verifica o token
    const payload = this.verifyResetToken(token);
    if (!payload) {
      return { success: false, error: 'Link inválido ou expirado' };
    }

    // 2. Valida força da senha
    if (!this.validateStrength(newPassword)) {
      return {
        success: false,
        error: 'Senha fraca. Use no mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.',
      };
    }

    // 3. Busca o usuário
    const user = await User.findOne({
      where: { id: payload.userId, email: payload.email },
    });

    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    if (!user.active) {
      return { success: false, error: 'Conta desativada' };
    }

    // 4. Atualiza a senha
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    return { success: true };
  }

  /**
   * Troca de senha autenticada (precisa da senha atual)
   */
  static async changePassword(
    userId: number,
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

    const user = await User.findByPk(userId);
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return { success: false, error: 'Senha atual incorreta' };
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    return { success: true };
  }
}