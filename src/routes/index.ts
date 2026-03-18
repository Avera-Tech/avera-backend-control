import { Router } from 'express';
import authRoutes from './auth.routes';
import syncRoutes from './sync.routes';
import seedRoutes from './seed.routes';

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
 * Autenticação
 */
router.use('/auth', authRoutes);

/**
 * Sincronização de models com o banco
 */
router.use('/sync', syncRoutes);

/**
 * Seed de dados iniciais (roles, permissions)
 */
router.use('/seed', seedRoutes);

export default router;