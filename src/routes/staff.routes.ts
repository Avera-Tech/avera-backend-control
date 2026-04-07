import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkPermissions } from '../core/middleware/checkPermissions';
import { StaffController } from '../core/staff/controllers/StaffController';

const router = Router();

/**
 * GET /staff
 * Query: ?active=true|false &search=texto
 */
router.get(
  '/',
  authenticateToken,
  checkPermissions(['staff:list']),
  StaffController.list,
);

/**
 * GET /staff/:id
 */
router.get(
  '/:id',
  authenticateToken,
  checkPermissions(['staff:read']),
  StaffController.getById,
);

/**
 * POST /staff
 * Body: { name, email, password, role, active?, phone?, employeeLevel? }
 */
router.post(
  '/',
  authenticateToken,
  checkPermissions(['staff:create']),
  StaffController.create,
);

/**
 * PATCH /staff/:id
 */
router.patch(
  '/:id',
  authenticateToken,
  checkPermissions(['staff:update']),
  StaffController.update,
);

/**
 * DELETE /staff/:id
 */
router.delete(
  '/:id',
  authenticateToken,
  checkPermissions(['staff:delete']),
  StaffController.remove,
);

export default router;
