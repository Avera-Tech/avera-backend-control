import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkPermissions } from '../core/middleware/checkPermissions';
import { ProductController } from '../core/products/controllers/productController';

const router = Router();

router.get(
  '/',
  authenticateToken,
  checkPermissions(['products:list']),
  ProductController.list,
);

router.post(
  '/',
  authenticateToken,
  checkPermissions(['products:create']),
  ProductController.create,
);

router.patch(
  '/:id',
  authenticateToken,
  checkPermissions(['products:update']),
  ProductController.update,
);

export default router;