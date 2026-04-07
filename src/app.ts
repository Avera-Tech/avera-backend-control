import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routes from './routes';

// Carregar variáveis de ambiente
dotenv.config();

const app: Application = express();

/**
 * Configurações de Segurança
 */

// Helmet - Proteção de headers HTTP
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limite de 100 requisições por IP
  message: {
    success: false,
    error: 'Muitas requisições deste IP, tente novamente mais tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

/**
 * Middlewares de Parsing
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Rotas
 */
app.use('/api', routes);

/**
 * Rota raiz
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Backend Node.js - Multi-Database (Master + Core) com RBAC',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',

      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        refresh: 'POST /api/auth/refresh',
        me: 'GET /api/auth/me',
        verifyOtp: 'POST /api/auth/verify-otp',
        resendOtp: 'POST /api/auth/resend-otp',
        requestReset: 'POST /api/auth/request-reset',
        resetPassword: 'POST /api/auth/reset-password',
        changePassword: 'POST /api/auth/change-password',
      },

      users: {
        list: 'GET /api/users',
        getById: 'GET /api/users/:id',
        create: 'POST /api/users',
        update: 'PUT /api/users/:id',
        remove: 'DELETE /api/users/:id',
        activate: 'PATCH /api/users/:id/activate',
        changePassword: 'PATCH /api/users/me/password',
        resetPassword: 'PATCH /api/users/:id/reset-password',
      },

      students: {
        list: 'GET /api/students',
        getById: 'GET /api/students/:id',
        create: 'POST /api/students',
        update: 'PATCH /api/students/:id',
        remove: 'DELETE /api/students/:id',
      },

      credits: {
        assign: 'POST /api/students/:id/credits',
        list: 'GET  /api/students/:id/credits',
        consume: 'POST /api/students/:id/credits/consume',
      },

      productTypes: {
        list: 'GET /api/product-types',
        create: 'POST /api/product-types',
        update: 'PATCH /api/product-types/:id',
      },

      products: {
        list: 'GET /api/products',
        create: 'POST /api/products',
        update: 'PATCH /api/products/:id',
      },

      system: {
        sync: 'POST /api/sync',
        seed: 'POST /api/seed',
        seedAdmin: 'POST /api/seed/admin',
      },
    }});
});

/**
 * Handler de rotas não encontradas (404)
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.path,
  });
});

/**
 * Handler de erros global
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Erro não tratado:', err);

  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
