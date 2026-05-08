import { Router } from 'express';
import { StudentAuthController } from '../core/auth/controllers/StudentAuthController';
import { authenticateStudent } from '../core/middleware/authenticateStudent';

const router = Router();

router.post('/register', StudentAuthController.register);
router.post('/login', StudentAuthController.login);
router.post('/refresh', StudentAuthController.refresh);
router.get('/me', authenticateStudent, StudentAuthController.me);

export default router;
