import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { getDashboardData } from '../core/dashboard/controllers/DashboardController';

const router = Router();

router.get('/', authenticateToken, getDashboardData);

export default router;
