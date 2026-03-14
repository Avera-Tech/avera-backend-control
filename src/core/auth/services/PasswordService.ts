import bcrypt from 'bcryptjs';
import User from '../../users/models/User.model';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,}$/;

export class PasswordService {
  /**
   * Valida a força da senha
   */
  static validateStrength(password: string): boolean {
    return PASSWORD_REGEX.test(password);
  }

  /**
   * Redefine a senha do funcionário (fluxo de reset — sem autenticação)
   */
  static async resetPassword(
    userId: number,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
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

    if (!user.active) {
      return { success: false, error: 'Conta desativada' };
    }

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