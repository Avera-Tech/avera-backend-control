import { Router } from 'express';
import { AuthController } from '../core/auth/controllers/AuthController';
import { PasswordController } from '../core/auth/controllers/PasswordController';
import { authenticateToken } from '../core/middleware/authenticateToken';

const router = Router();

// ─── Autenticação ─────────────────────────────────────────────────────────────

/** POST /api/auth/login */
router.post('/login', AuthController.login);

/** POST /api/auth/register */
router.post('/register', AuthController.register);

/** POST /api/auth/refresh */
router.post('/refresh', AuthController.refresh);

/** GET /api/auth/me */
router.get('/me', authenticateToken, AuthController.me);

// ─── Verificação de conta (OTP signup) ───────────────────────────────────────

/** POST /api/auth/verify-otp */
router.post('/verify-otp', PasswordController.verifyOtp);

/** POST /api/auth/resend-otp */
router.post('/resend-otp', PasswordController.resendOtp);

// ─── Reset de senha via link ──────────────────────────────────────────────────

/** POST /api/auth/request-reset → envia email com link */
router.post('/request-reset', PasswordController.requestReset);

/** POST /api/auth/reset-password → recebe token do link + nova senha */
router.post('/reset-password', PasswordController.resetPassword);

// ─── Troca de senha autenticada ───────────────────────────────────────────────

/** POST /api/auth/change-password 🔒 */
router.post('/change-password', authenticateToken, PasswordController.changePassword);

export default router;