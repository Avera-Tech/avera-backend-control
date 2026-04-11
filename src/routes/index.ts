import { Router } from 'express';
import authRoutes from './auth.routes';
import syncRoutes from './sync.routes';
import seedRoutes from './seed.routes';
import productTypeRoutes from './productType.routes';
import productRoutes from './product.routes';
import staffRoutes from '../modules/staff/routes/staff.routes';
import userRoutes from '../modules/user/routes/user.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/sync', syncRoutes);
router.use('/seed', seedRoutes);
router.use('/product-types', productTypeRoutes);
router.use('/products', productRoutes);
router.use('/staff', staffRoutes);
router.use('/users', userRoutes);

export default router;