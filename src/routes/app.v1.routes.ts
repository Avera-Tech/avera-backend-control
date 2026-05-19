/**
 * src/routes/app.v1.routes.ts
 * Prefixo: /app/v1
 */

import { Router } from 'express';
import studentAuthRoutes from './studentAuth.routes';
import { StudentHomeController } from '../core/student/controllers/StudentHomeController';
import { StudentCreditController } from '../core/student/controllers/StudentCreditController';
import { ModalityController } from '../core/modalities/controllers/ModalityController';
import { ProductController } from '../core/products/controllers/ProductController';
import { authenticateStudent } from '../core/middleware/authenticateStudent';

const router = Router();

router.use('/auth', studentAuthRoutes);

router.get('/student/home', authenticateStudent, StudentHomeController.getHomeData);
router.get('/student/credits/history', authenticateStudent, StudentCreditController.getCreditHistory);
router.get('/student/credits', authenticateStudent, StudentCreditController.getMyCredits);

router.get('/modalities', authenticateStudent, ModalityController.dropdown);

// Loja: pacotes avulsos e planos recorrentes
router.get('/store/products', authenticateStudent, ProductController.list);

export default router;