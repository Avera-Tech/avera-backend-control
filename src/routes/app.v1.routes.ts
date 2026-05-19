/**
 * src/routes/app.v1.routes.ts
 *
 * Rotas do app mobile do aluno.
 * Prefixo: /app/v1
 */

import { Router } from 'express';
import studentAuthRoutes           from './studentAuth.routes';
import { StudentHomeController }   from '../core/student/controllers/StudentHomeController';
import { StudentCreditController } from '../core/student/controllers/StudentCreditController';
import { ModalityController }      from '../core/modalities/controllers/ModalityController';
import { authenticateStudent }     from '../core/middleware/authenticateStudent';

const router = Router();

// ── Autenticação ──────────────────────────────────────────────────────────────
router.use('/auth', studentAuthRoutes);

// ── Home ──────────────────────────────────────────────────────────────────────
router.get('/student/home',
  authenticateStudent,
  StudentHomeController.getHomeData,
);

// ── Créditos ──────────────────────────────────────────────────────────────────
router.get('/student/credits/history',
  authenticateStudent,
  StudentCreditController.getCreditHistory,
);
router.get('/student/credits',
  authenticateStudent,
  StudentCreditController.getMyCredits,
);

// ── Modalidades ───────────────────────────────────────────────────────────────
// Reutiliza o ModalityController.dropdown existente — só ativas, sem autenticação de staff
router.get('/modalities',
  authenticateStudent,
  ModalityController.dropdown,
);

export default router;