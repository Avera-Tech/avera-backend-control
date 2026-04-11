import { Router } from 'express';
import { authenticateToken } from '../../../core/middleware/authenticateToken';
import {
  getUsersDropdown,
  listUsers,
  createUser,
  getUserById,
  updateUser,
} from '../controllers/userController';
import { CreditController } from '../../../core/credits/controllers/CreditController';

const router = Router();

// GET /users/dropdown — deve vir antes de /:id para evitar conflito de rota
router.get('/dropdown', authenticateToken, getUsersDropdown);

router.get('/', authenticateToken, listUsers);
router.post('/', authenticateToken, createUser);
router.get('/:id', authenticateToken, getUserById);
router.patch('/:id', authenticateToken, updateUser);

// ─── Créditos ─────────────────────────────────────────────────────────────────
router.post('/:id/credits', authenticateToken, CreditController.assignCredits);
router.get('/:id/credits', authenticateToken, CreditController.getClientCredits);
router.post('/:id/credits/consume', authenticateToken, CreditController.consumeCredit);

export default router;
