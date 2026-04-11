import { Router } from 'express';
import { authenticateToken } from '../../../core/middleware/authenticateToken';
import {
  listStaff,
  createStaff,
  getStaffById,
  updateStaff,
  deactivateStaff,
} from '../controllers/staffController';

const router = Router();

router.get('/', authenticateToken, listStaff);
router.post('/', authenticateToken, createStaff);
router.get('/:id', authenticateToken, getStaffById);
router.patch('/:id', authenticateToken, updateStaff);
router.patch('/:id/deactivate', authenticateToken, deactivateStaff);

export default router;
