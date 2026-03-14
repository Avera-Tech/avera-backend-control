import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Employee from '../../employees/models/Employee.model';
import Role from '../../rbac/models/Role.model';
import UserRole from '../../rbac/models/UserRole.model';

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

      const employee = await Employee.findOne({ where: { email: normalizedEmail } });

      if (!employee) {
        return { success: false, error: 'Email ou senha incorretos' };
      }

      if (!employee.active) {
        return { success: false, error: 'Conta desativada' };
      }

      const passwordMatch = await bcrypt.compare(password, employee.password);
      if (!passwordMatch) {
        return { success: false, error: 'Email ou senha incorretos' };
      }

      employee.lastLogin = new Date();
      await employee.save();

      const payload: JWTPayload = { userId: employee.id, email: employee.email };
      const token = this.generateAuthToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      return {
        success: true,
        token,
        refreshToken,
        expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'],
        user: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
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
    roleSlug: string = 'user'
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const existing = await Employee.findOne({ where: { email: normalizedEmail } });
      if (existing) {
        return { success: false, error: 'Email já cadastrado' };
      }

      const role = await Role.findOne({ where: { slug: roleSlug, active: true } });
      if (!role) {
        return { success: false, error: `Role '${roleSlug}' não encontrada` };
      }

      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const employee = await Employee.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        active: true,
        emailVerified: false,
      });

      await UserRole.create({
        userId: employee.id,
        roleId: role.id,
      });

      return {
        success: true,
        user: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
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