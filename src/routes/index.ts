import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

/**
 * Rotas da aplicação
 */
router.use('/auth', authRoutes);

/**
 * Health check
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
  });
});

export default router;
