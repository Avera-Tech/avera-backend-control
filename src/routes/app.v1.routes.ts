/**
 * src/routes/app.v1.routes.ts
 * Prefixo: /app/v1
 */

import { Router } from 'express';
import studentAuthRoutes from './studentAuth.routes';
import { StudentHomeController } from '../core/student/controllers/StudentHomeController';
import { StudentCreditController } from '../core/student/controllers/StudentCreditController';
import { StudentClassController } from '../core/student/controllers/StudentClassController';
import { ModalityController } from '../core/modalities/controllers/ModalityController';
import { ProductController } from '../core/products/controllers/ProductController';
import { checkoutCard } from '../core/checkout/controllers/Checkout.controller';
import { checkoutPix } from '../core/checkout/controllers/Pix.controller';
import { authenticateStudent } from '../core/middleware/authenticateStudent';

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
router.use('/auth', studentAuthRoutes);

// ── Home ──────────────────────────────────────────────────────────────────────
router.get('/student/home', authenticateStudent, StudentHomeController.getHomeData);

// ── Créditos ──────────────────────────────────────────────────────────────────
router.get('/student/credits/history', authenticateStudent, StudentCreditController.getCreditHistory);
router.get('/student/credits', authenticateStudent, StudentCreditController.getMyCredits);

// ── Catálogo ──────────────────────────────────────────────────────────────────
router.get('/modalities', authenticateStudent, ModalityController.dropdown);
router.get('/store/products', authenticateStudent, ProductController.list);

// ── Aulas ─────────────────────────────────────────────────────────────────────
router.get('/classes', authenticateStudent, StudentClassController.list);
router.post('/classes/:id/enroll', authenticateStudent, StudentClassController.enroll);
router.post('/classes/:id/cancel', authenticateStudent, StudentClassController.cancel);

// ── Checkout ──────────────────────────────────────────────────────────────────
router.post('/checkout/card', authenticateStudent, (req, res, next) => {
  req.body.userId = String(req.student!.studentId);
  next();
}, checkoutCard);

router.post('/checkout/pix', authenticateStudent, (req, res, next) => {
  req.body.studentId = String(req.student!.studentId);
  next();
}, checkoutPix);

export default router;