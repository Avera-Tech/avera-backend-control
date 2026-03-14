import { Router } from 'express';
import authRoutes from './auth.routes';
import syncRoutes from './sync.routes';

const router = Router();

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

/**
 * Rotas da aplicação
 */
router.use('/auth', authRoutes);

 
/**
 * Sincronização de models
 */
router.use('/sync', syncRoutes);

export default router;
