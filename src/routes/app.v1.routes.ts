/**
 * src/routes/app.v1.routes.ts
 * Prefixo: /app/v1
 */

import { Router } from 'express';
import studentAuthRoutes           from './studentAuth.routes';
import { StudentHomeController }   from '../core/student/controllers/StudentHomeController';
import { StudentCreditController } from '../core/student/controllers/StudentCreditController';
import { ModalityController }      from '../core/modalities/controllers/ModalityController';
import { ProductController }       from '../core/products/controllers/ProductController';
import { checkoutCard }            from '../core/checkout/controllers/Checkout.controller';
import { checkoutPix }             from '../core/checkout/controllers/Pix.controller';
import { authenticateStudent }     from '../core/middleware/authenticateStudent';

const router = Router();

// ── Autenticação ──────────────────────────────────────────────────────────────
router.use('/auth', studentAuthRoutes);

// ── Home ──────────────────────────────────────────────────────────────────────
router.get('/student/home',            authenticateStudent, StudentHomeController.getHomeData);

// ── Créditos ──────────────────────────────────────────────────────────────────
router.get('/student/credits/history', authenticateStudent, StudentCreditController.getCreditHistory);
router.get('/student/credits',         authenticateStudent, StudentCreditController.getMyCredits);

// ── Catálogo ──────────────────────────────────────────────────────────────────
router.get('/modalities',              authenticateStudent, ModalityController.dropdown);
router.get('/store/products',          authenticateStudent, ProductController.list);

// ── Checkout ──────────────────────────────────────────────────────────────────
// O checkoutCard usa req.body.userId — o middleware authenticateStudent
// injeta req.student.studentId; o adapter abaixo repassa como userId.
router.post('/checkout/card', authenticateStudent, (req, res, next) => {
  // Garante que o userId no body vem do token JWT, não do cliente
  req.body.userId = String(req.student!.studentId);
  next();
}, checkoutCard);

router.post('/checkout/pix', authenticateStudent, (req, res, next) => {
  // O checkoutPix usa req.body.studentId
  req.body.studentId = String(req.student!.studentId);
  next();
}, checkoutPix);

export default router;