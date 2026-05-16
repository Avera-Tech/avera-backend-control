/**
 * src/routes/studentAuth.routes.ts
 *
 * Rotas de autenticação do app mobile do aluno.
 * Prefixo registrado em app.ts: /app/v1/auth
 *
 * Rotas públicas (sem token):
 *   POST /register        → cadastro
 *   POST /login           → login
 *   POST /refresh         → renovar token
 *   POST /request-reset   → solicitar reset de senha por email
 *   POST /reset-password  → redefinir senha com token do email
 *
 * Rotas protegidas (Bearer token obrigatório):
 *   GET  /me              → dados do aluno logado
 */

import { Router } from 'express';
import { StudentAuthController }     from '../core/auth/controllers/StudentAuthController';
import { StudentPasswordController } from '../core/auth/controllers/StudentPasswordController';
import { authenticateStudent }       from '../core/middleware/authenticateStudent';

const router = Router();

// ── Autenticação ──────────────────────────────────────────────────────────────

router.post('/register',       StudentAuthController.register);
router.post('/login',          StudentAuthController.login);
router.post('/refresh',        StudentAuthController.refresh);

// ── Reset de senha ────────────────────────────────────────────────────────────

router.post('/request-reset',  StudentPasswordController.requestReset);
router.post('/reset-password', StudentPasswordController.resetPassword);

// ── Rotas protegidas ──────────────────────────────────────────────────────────

router.get('/me', authenticateStudent, StudentAuthController.me);

export default router;