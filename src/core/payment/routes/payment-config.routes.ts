import { Router } from 'express';
import { getPaymentConfig, upsertPaymentConfig } from '../controllers/PaymentConfigController';

const router = Router();

router.get('/',  getPaymentConfig);
router.put('/',  upsertPaymentConfig);

export default router;
