import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { CreditController } from '../core/credits/controllers/CreditController';
import { checkPermissions } from '../core/middleware/checkPermissions';

const router = Router();

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