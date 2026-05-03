import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'node:path';
import routes from './routes';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app: Application = express();

app.set('trust proxy', 1);

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
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    version: '1.0.2',
  });
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
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro não tratado:', err);

  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
