/**
 * src/core/auth/services/StudentPasswordService.ts
 *
 * Lógica de reset de senha para alunos (ClientUser).
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TenantDb } from '../../../config/tenantModels';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,}$/;

const RESET_TOKEN_EXPIRY = '1h';

/**
 * URL base do frontend mobile.
 * Ex: http://localhost:8080 ou https://app.averafit.app
 *
 * NÃO inclui o slug nem o path — eles são montados dinamicamente
 * no buildResetLink a partir do clientId recebido no header.
 */
const FRONTEND_BASE_URL =
  process.env.FRONTEND_STUDENT_BASE_URL || 'http://localhost:8080';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResetTokenPayload {
  studentId: number;
  email: string;
  type: 'student_password_reset';
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class StudentPasswordService {
  static validateStrength(password: string): boolean {
    return PASSWORD_REGEX.test(password);
  }

  static generateResetToken(studentId: number, email: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado');

    return jwt.sign(
      { studentId, email, type: 'student_password_reset' } satisfies ResetTokenPayload,
      secret,
      { expiresIn: RESET_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'] },
    );
  }

  static verifyResetToken(token: string): { studentId: number; email: string } | null {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET não configurado');

      const decoded = jwt.verify(token, secret) as ResetTokenPayload;
      if (decoded.type !== 'student_password_reset') return null;

      return { studentId: decoded.studentId, email: decoded.email };
    } catch {
      return null;
    }
  }

  /**
   * Monta o link de reset incluindo o slug do tenant na URL.
   *
   * Resultado: http://localhost:8080/avera-sports/reset-senha?token=xxxxx
   *
   * @param token  JWT de reset gerado por generateResetToken
   * @param clientId  Slug do tenant (vem do header X-Client-Id)
   */
  static buildResetLink(token: string, clientId: string): string {
    return `${FRONTEND_BASE_URL}/${clientId}/reset-senha?token=${token}`;
  }

  static async resetPassword(
    token: string,
    newPassword: string,
    db: TenantDb,
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

    const { ClientUser } = db;
    const student = await ClientUser.findOne({
      where: { id: payload.studentId, email: payload.email },
    });

    if (!student) return { success: false, error: 'Aluno não encontrado' };
    if (!student.active) return { success: false, error: 'Conta desativada' };

    student.password = await bcrypt.hash(newPassword, 10);
    await student.save();

    return { success: true };
  }
}