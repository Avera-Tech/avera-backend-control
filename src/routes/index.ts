import { Router } from 'express';
import { MasterAccessController } from '../core/auth/controllers/MasterAccessController';
import authRoutes from './auth.routes';
import syncRoutes from './sync.routes';
import masterSyncRoutes from './masterSync.routes';
import publicRoutes from './public.routes';
import seedInitRoutes from './seedInit.routes';
import { resolveTenant } from '../core/middleware/resolveTenant';
import seedRoutes from './seed.routes';
import modalityRoutes from './modality.routes';
import productTypeRoutes from './productType.routes';
import productRoutes from './product.routes';
import staffRoutes from '../modules/staff/routes/staff.routes';
import userRoutes from '../modules/user/routes/user.routes';
import classRoutes from '../modules/class/routes/class.routes';
import waitingListRoutes from '../modules/class/routes/waitingList.routes';
import placeRoutes from '../modules/place/routes/place.routes';
import checkoutRoutes from './checkout.routes';
import themeRoutes from './theme.routes';
import companyRoutes from './company.routes';
import integrationRoutes from '../fit/integrations/routes/integrationRoutes';
import { pixWebhook } from '../core/checkout/controllers/Pix.controller';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
  });
});

// Public — Master backend registers/updates tenant credentials (no X-Client-Id needed)
router.use('/sync/tenant-config', masterSyncRoutes);

// Public — frontend busca nome/tema do tenant antes do login (no X-Client-Id needed)
router.use('/public', publicRoutes);

// Public — seed inicial de um tenant específico (sem X-Client-Id, resolve internamente)
router.use('/seed/init', seedInitRoutes);

// Public — troca de master token por JWT do tenant
router.post('/auth/master-access', MasterAccessController.exchange);

// Public webhooks — external callbacks with no X-Client-Id header
// Tenant is resolved from URL param (Wellhub) or order metadata (Pagar.me PIX)
router.post('/checkout/pix/webhook', pixWebhook);
router.use('/webhooks', integrationRoutes);

// All routes below require a valid X-Client-Id header and active tenant plan
router.use(resolveTenant);

router.use('/auth', authRoutes);
router.use('/sync', syncRoutes);
router.use('/seed', seedRoutes);
router.use('/modalities', modalityRoutes);
router.use('/product-types', productTypeRoutes);
router.use('/products', productRoutes);
router.use('/classes', classRoutes);
router.use('/', waitingListRoutes);
router.use('/places', placeRoutes);
router.use('/staff', staffRoutes);
router.use('/users', userRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/theme', themeRoutes);
router.use('/company', companyRoutes);
router.use('/integrations', integrationRoutes);

export default router;
