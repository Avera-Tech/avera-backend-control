import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../users/models/User.model';
import Role from '../../rbac/models/Role.model';
import UserRole from '../../rbac/models/UserRole.model';
import { OtpService } from './OtpService';

export interface JWTPayload {
  userId: number;
  email: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: string | number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  error?: string;
  requiresVerification?: boolean;
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

  static async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const user = await User.findOne({ where: { email: normalizedEmail } });

      if (!user) {
        return { success: false, error: 'Email ou senha incorretos' };
      }

      if (!user.emailVerified) {
        // Reenvia OTP caso a conta ainda não foi verificada
        await OtpService.sendOtp(user.id, user.email, 'signup');
        return {
          success: false,
          error: 'Conta pendente de verificação. Enviamos um novo código para o seu email.',
          requiresVerification: true,
        };
      }

      if (!user.active) {
        return { success: false, error: 'Conta desativada' };
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return { success: false, error: 'Email ou senha incorretos' };
      }

      user.lastLogin = new Date();
      await user.save();

      const payload: JWTPayload = { userId: user.id, email: user.email };
      const token = this.generateAuthToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      return {
        success: true,
        token,
        refreshToken,
        expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'],
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error: any) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro ao realizar login' };
    }
  }

  static async register(
    name: string,
    email: string,
    password: string,
    roleSlug: string = 'admin'
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const existing = await User.findOne({ where: { email: normalizedEmail } });
      if (existing) {
        return { success: false, error: 'Email já cadastrado' };
      }

      const role = await Role.findOne({ where: { slug: roleSlug, active: true } });
      if (!role) {
        return { success: false, error: `Role '${roleSlug}' não encontrada` };
      }

      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        active: false,        // inativo até verificar o email
        emailVerified: false,
      });

      await UserRole.create({
        userId: user.id,
        roleId: role.id,
      });

      // Envia OTP de verificação por email
      await OtpService.sendOtp(user.id, user.email, 'signup');

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: roleSlug,
        },
      };
    } catch (error: any) {
      console.error('Erro no registro:', error);
      return { success: false, error: 'Erro ao registrar usuário' };
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
}