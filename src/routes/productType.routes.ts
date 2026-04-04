import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkPermissions } from '../core/middleware/checkPermissions';
import { ProductTypeController } from '../core/products/controllers/ProductTypeController';

const router = Router();

router.get(
  '/',
  authenticateToken,
  checkPermissions(['products:list']),
  ProductTypeController.list
);

router.post(
  '/',
  authenticateToken,
  checkPermissions(['products:create']),
  ProductTypeController.create
);

router.patch(
  '/:id',
  authenticateToken,
  checkPermissions(['products:update']),
  ProductTypeController.update
);

export default router;