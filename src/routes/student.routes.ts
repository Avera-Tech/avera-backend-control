import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkPermissions } from '../core/middleware/checkPermissions';
import { StudentController } from '../core/students/controllers/StudentController';
import { CreditController } from '../core/credits/controllers/CreditController';

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
  StudentController.list,
);

/**
 * GET /students/:id
 */
router.get(
  '/:id',
  authenticateToken,
  checkPermissions(['students:read']),
  StudentController.getById,
);

/**
 * POST /students
 * Body: { name, email, password, phone, cpf, birthday, zipCode, state, city, address, notes, active }
 */
router.post(
  '/',
  authenticateToken,
  checkPermissions(['students:create']),
  StudentController.create,
);

/**
 * PATCH /students/:id
 * Body: { name, email, password, phone, cpf, birthday, zipCode, state, city, address, notes, active }
 */
router.patch(
  '/:id',
  authenticateToken,
  checkPermissions(['students:update']),
  StudentController.update,
);

/**
 * DELETE /students/:id
 */
router.delete(
  '/:id',
  authenticateToken,
  checkPermissions(['students:delete']),
  StudentController.remove,
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
  CreditController.getStudentCredits,
);

router.post(
  '/:id/credits/consume',
  authenticateToken,
  checkPermissions(['students:update']),
  CreditController.consumeCredit,
);

export default router;