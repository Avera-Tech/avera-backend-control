import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TenantDb } from '../../../config/tenantModels';

export interface JWTPayload {
  staffId: number;
  email: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: string | number;
  staff?: { id: number; name: string; email: string };
  error?: string;
}

export class AuthService {
  static generateAuthToken(payload: JWTPayload): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado');
    return jwt.sign(payload, secret, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'],
    });
  }

  static generateRefreshToken(payload: JWTPayload): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado');
    return jwt.sign({ ...payload, type: 'refresh' }, secret, {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    });
  }

  static async login(email: string, password: string, db: TenantDb): Promise<LoginResponse> {
    try {
      const { Staff } = db;
      const normalizedEmail = email.trim().toLowerCase();

      const staff = await Staff.findOne({ where: { email: normalizedEmail } });

      if (!staff) return { success: false, error: 'Email ou senha incorretos' };
      if (!staff.active) return { success: false, error: 'Conta desativada' };

      const passwordMatch = await bcrypt.compare(password, staff.password);
      if (!passwordMatch) return { success: false, error: 'Email ou senha incorretos' };

      staff.lastLogin = new Date();
      await staff.save();

      const payload: JWTPayload = { staffId: staff.id, email: staff.email };
      const token = this.generateAuthToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      return {
        success: true, token, refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        staff: { id: staff.id, name: staff.name, email: staff.email },
      };
    } catch (error: any) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro ao realizar login' };
    }
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET não configurado');
      return jwt.verify(token, secret) as JWTPayload;
    } catch {
      return null;
    }
  }

  static async register(
    name: string,
    email: string,
    password: string,
    db: TenantDb,
    roleSlug: string = 'admin'
  ): Promise<{ success: boolean; staff?: any; error?: string }> {
    try {
      const { Staff, Role, UserRole } = db;
      const normalizedEmail = email.trim().toLowerCase();

      const existing = await Staff.findOne({ where: { email: normalizedEmail } });
      if (existing) return { success: false, error: 'Email já cadastrado' };

      const role = await Role.findOne({ where: { slug: roleSlug, active: true } });
      if (!role) return { success: false, error: `Role '${roleSlug}' não encontrada` };

      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const staff = await Staff.create({
        name, email: normalizedEmail, password: hashedPassword,
        active: true, emailVerified: true,
      });

      await UserRole.create({ staffId: staff.id, roleId: role.id });

      return { success: true, staff: { id: staff.id, name: staff.name, email: staff.email, role: roleSlug } };
    } catch (error: any) {
      console.error('Erro no registro:', error);
      return { success: false, error: 'Erro ao registrar staff' };
    }
  }
}
