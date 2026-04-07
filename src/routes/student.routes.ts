import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkPermissions } from '../core/middleware/checkPermissions';
import { StudentController } from '../core/students/controllers/StudentController';
import { CreditController } from '../core/credits/controllers/CreditController';

const router = Router();

// ─── CRUD de alunos ───────────────────────────────────────────────────────────

router.get(
  '/',
  authenticateToken,
  checkPermissions(['students:list']),
  StudentController.list,
);

router.get(
  '/:id',
  authenticateToken,
  checkPermissions(['students:read']),
  StudentController.getById,
);

router.post(
  '/',
  authenticateToken,
  checkPermissions(['students:create']),
  StudentController.create,
);

router.patch(
  '/:id',
  authenticateToken,
  checkPermissions(['students:update']),
  StudentController.update,
);

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