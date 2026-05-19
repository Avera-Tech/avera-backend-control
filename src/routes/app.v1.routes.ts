/**
 * src/routes/app.v1.routes.ts
 *
 * Rotas do app mobile do aluno.
 * Prefixo registrado em app.ts: /app/v1
 *
 * Todas as rotas abaixo já passaram pelo resolveTenant (X-Client-Id validado).
 */

import { Router } from 'express';
import studentAuthRoutes           from './studentAuth.routes';
import { StudentHomeController }   from '../core/student/controllers/StudentHomeController';
import { StudentCreditController } from '../core/student/controllers/StudentCreditController';
import { authenticateStudent }     from '../core/middleware/authenticateStudent';

const router = Router();

// ── Autenticação ──────────────────────────────────────────────────────────────
// register, login, refresh, request-reset, reset-password
router.use('/auth', studentAuthRoutes);

// ── Home ──────────────────────────────────────────────────────────────────────
router.get('/student/home',
  authenticateStudent,
  StudentHomeController.getHomeData,
);

// ── Créditos ──────────────────────────────────────────────────────────────────
// /history deve vir antes de / para não ser capturado como rota errada
router.get('/student/credits/history',
  authenticateStudent,
  StudentCreditController.getCreditHistory,
);

router.get('/student/credits',
  authenticateStudent,
  StudentCreditController.getMyCredits,
);

export default router;