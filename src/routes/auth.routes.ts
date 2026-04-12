import { Router } from 'express';
import { AuthController } from '../core/auth/controllers/AuthController';
import { PasswordController } from '../core/auth/controllers/PasswordController';
import { authenticateToken } from '../core/middleware/authenticateToken';

const router = Router();

/** POST /api/auth/login */
router.post('/login', AuthController.login);

/** POST /api/auth/refresh */
router.post('/refresh', AuthController.refresh);

/** GET /api/auth/me */
router.get('/me', authenticateToken, AuthController.me);

/** POST /api/auth/request-reset → envia email com link */
router.post('/request-reset', PasswordController.requestReset);

/** POST /api/auth/reset-password → recebe token do link + nova senha */
router.post('/reset-password', PasswordController.resetPassword);

/** POST /api/auth/change-password 🔒 */
router.post('/change-password', authenticateToken, PasswordController.changePassword);

export default router;
