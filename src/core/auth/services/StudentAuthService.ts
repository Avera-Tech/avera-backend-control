import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TenantDb } from '../../../config/tenantModels';

export interface StudentRegisterResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: string | number;
  student?: { id: number; name: string; email: string };
  error?: string;
}

export interface StudentJWTPayload {
  studentId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface StudentLoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: string | number;
  student?: { id: number; name: string; email: string };
  error?: string;
}

export class StudentAuthService {
  static generateAuthToken(payload: Omit<StudentJWTPayload, 'iat' | 'exp'>): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado');
    return jwt.sign(payload, secret, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'],
    });
  }

  static generateRefreshToken(payload: Omit<StudentJWTPayload, 'iat' | 'exp'>): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado');
    return jwt.sign({ ...payload, type: 'refresh' }, secret, {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    });
  }

  static async login(email: string, password: string, db: TenantDb): Promise<StudentLoginResponse> {
    try {
      const { ClientUser } = db;
      const normalizedEmail = email.trim().toLowerCase();

      const student = await ClientUser.findOne({ where: { email: normalizedEmail } });

      if (!student) return { success: false, error: 'Email ou senha incorretos' };
      if (!student.active) return { success: false, error: 'Conta desativada' };
      if (!student.password) return { success: false, error: 'Acesso não configurado. Entre em contato com a academia.' };

      const passwordMatch = await bcrypt.compare(password, student.password);
      if (!passwordMatch) return { success: false, error: 'Email ou senha incorretos' };

      const payload: Omit<StudentJWTPayload, 'iat' | 'exp'> = { studentId: student.id, email: student.email };
      const token = this.generateAuthToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      return {
        success: true,
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        student: { id: student.id, name: student.name, email: student.email },
      };
    } catch (error: any) {
      console.error('Erro no login do aluno:', error);
      return { success: false, error: 'Erro ao realizar login' };
    }
  }

  static verifyToken(token: string): StudentJWTPayload | null {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET não configurado');
      return jwt.verify(token, secret) as StudentJWTPayload;
    } catch {
      return null;
    }
  }

  static async register(
    data: {
      name: string; email: string; password: string;
      phone?: string; document?: string; birthday?: string;
      height?: number; weight?: number;
      address?: string; city?: string; state?: string; zipCode?: string;
    },
    db: TenantDb
  ): Promise<StudentRegisterResponse> {
    try {
      const { ClientUser } = db;
      const normalizedEmail = data.email.trim().toLowerCase();

      const existing = await ClientUser.findOne({ where: { email: normalizedEmail } });
      if (existing) return { success: false, error: 'Email já cadastrado' };

      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      const student = await ClientUser.create({
        name: data.name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: data.phone ?? null,
        document: data.document ?? null,
        birthday: data.birthday ? new Date(data.birthday) : null,
        height: data.height ?? null,
        weight: data.weight ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zipCode: data.zipCode ?? null,
      });

      const payload: Omit<StudentJWTPayload, 'iat' | 'exp'> = { studentId: student.id, email: student.email };
      const token = this.generateAuthToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      return {
        success: true,
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        student: { id: student.id, name: student.name, email: student.email },
      };
    } catch (error: any) {
      console.error('Erro no cadastro do aluno:', error);
      return { success: false, error: 'Erro ao realizar cadastro' };
    }
  }
}
