import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkPermissions } from '../core/middleware/checkPermissions';
import { listUsers, getUserById, createUser, updateUser } from '../modules/user/controllers/userController';
import { CreditController } from '../fit/credits/controllers/CreditController';

const router = Router();

// ─── CRUD de alunos ───────────────────────────────────────────────────────────

/**
 * GET /students
 * Query: ?active=true|false &search=texto
 */
router.get(
  '/',
  authenticateToken,
  checkPermissions(['students:list']),
  listUsers,
);

/**
 * GET /students/:id
 */
router.get(
  '/:id',
  authenticateToken,
  checkPermissions(['students:read']),
  getUserById,
);

/**
 * POST /students
 * Body: { name, email, password, phone, cpf, birthday, zipCode, state, city, address, notes, active }
 */
router.post(
  '/',
  authenticateToken,
  checkPermissions(['students:create']),
  createUser,
);

/**
 * PATCH /students/:id
 * Body: { name, email, password, phone, cpf, birthday, zipCode, state, city, address, notes, active }
 */
router.patch(
  '/:id',
  authenticateToken,
  checkPermissions(['students:update']),
  updateUser,
);

/**
 * DELETE /students/:id
 */
router.delete(
  '/:id',
  authenticateToken,
  checkPermissions(['students:delete']),
  (_req, res) => res.status(501).json({ success: false, message: 'Not implemented' }),
);

// ─── Créditos ─────────────────────────────────────────────────────────────────

router.post(
  '/:id/credits',
  authenticateToken,
  checkPermissions(['students:update']),
  CreditController.assignCredits,
);

router.get(
  '/:id/credits',
  authenticateToken,
  checkPermissions(['students:read']),
  CreditController.getClientCredits,
);

router.post(
  '/:id/credits/consume',
  authenticateToken,
  checkPermissions(['students:update']),
  CreditController.consumeCredit,
);

export default router;