import { Router } from 'express';
import { authenticateToken } from '../../../core/middleware/authenticateToken';
import {
  getUsersDropdown,
  listLevels,
  listUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { CreditController } from '../../../fit/credits/controllers/CreditController';

const router = Router();

// Rotas fixas — devem vir antes de /:id para evitar conflito de rota
router.get('/dropdown', authenticateToken, getUsersDropdown);
router.get('/levels', authenticateToken, listLevels);

router.get('/', authenticateToken, listUsers);
router.post('/', authenticateToken, createUser);
router.get('/:id', authenticateToken, getUserById);
router.patch('/:id', authenticateToken, updateUser);
router.delete('/:id', authenticateToken, deleteUser);

// ─── Créditos ─────────────────────────────────────────────────────────────────
router.post('/:id/credits', authenticateToken, CreditController.assignCredits);
router.get('/:id/credits', authenticateToken, CreditController.getClientCredits);
router.post('/:id/credits/consume', authenticateToken, CreditController.consumeCredit);

export default router;
