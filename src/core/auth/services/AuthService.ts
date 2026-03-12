import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../auth/models/User.model';

/**
 * Interface do payload do JWT
 */
export interface JWTPayload {
  userId: number;
  email: string;
}

/**
 * Interface de resposta de login
 */
export interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  error?: string;
}

/**
 * Serviço de Autenticação
 */
export class AuthService {
  /**
   * Gera token JWT de autenticação
   */
  static generateAuthToken(payload: JWTPayload): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET não configurado');
    }

    return jwt.sign(payload, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });
  }

  /**
   * Gera refresh token
   */
  static generateRefreshToken(payload: JWTPayload): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET não configurado');
    }

    return jwt.sign({ ...payload, type: 'refresh' }, secret, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
  }

  /**
   * Realiza login do usuário
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // 1. Normalizar email
      const normalizedEmail = email.trim().toLowerCase();

      // 2. Buscar usuário
      const user = await User.findOne({
        where: { email: normalizedEmail },
      });

      if (!user) {
        return {
          success: false,
          error: 'Email ou senha incorretos',
        };
      }

      // 3. Verificar se está ativo
      if (!user.active) {
        return {
          success: false,
          error: 'Conta desativada',
        };
      }

      // 4. Verificar senha
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return {
          success: false,
          error: 'Email ou senha incorretos',
        };
      }

      // 5. Atualizar último login
      user.lastLogin = new Date();
      await user.save();

      // 6. Gerar tokens
      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
      };

      const token = this.generateAuthToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      return {
        success: true,
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error: any) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: 'Erro ao realizar login',
      };
    }
  }

  /**
   * Registra novo usuário
   */
  static async register(
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // 1. Normalizar email
      const normalizedEmail = email.trim().toLowerCase();

      // 2. Verificar se já existe
      const existingUser = await User.findOne({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'Email já cadastrado',
        };
      }

      // 3. Hash da senha
      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 4. Criar usuário
      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        active: true,
        emailVerified: false,
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error: any) {
      console.error('Erro no registro:', error);
      return {
        success: false,
        error: 'Erro ao registrar usuário',
      };
    }
  }

  /**
   * Verifica validade do token
   */
  static verifyToken(token: string): JWTPayload | null {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET não configurado');
      }

      return jwt.verify(token, secret) as JWTPayload;
    } catch (error) {
      return null;
    }
  }
}
