import { Router } from 'express';
import { AuthController } from '../core/auth/controllers/AuthController';
import { authenticateToken } from '../core/middleware/authenticateToken';

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc Login de usuário
 * @access Public
 */
router.post('/login', AuthController.login);

/**
 * @route POST /api/auth/register
 * @desc Registro de novo usuário
 * @access Public
 */
router.post('/register', AuthController.register);

/**
 * @route POST /api/auth/refresh
 * @desc Renovar token de autenticação
 * @access Public
 */
router.post('/refresh', AuthController.refresh);

/**
 * @route GET /api/auth/me
 * @desc Obter dados do usuário autenticado
 * @access Private
 */
router.get('/me', authenticateToken, AuthController.me);

export default router;
