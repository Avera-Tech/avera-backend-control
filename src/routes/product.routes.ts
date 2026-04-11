import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkPermissions } from '../core/middleware/checkPermissions';
import { ProductController } from '../core/products/controllers/ProductController';

const router = Router();

/**
 * GET /products
 */
router.get(
  '/',
  authenticateToken,
  checkPermissions(['products:list']),
  ProductController.list,
);

/**
 * GET /products/:id
 */
router.get(
  '/:id',
  authenticateToken,
  checkPermissions(['products:read']),
  ProductController.getById,
);

/**
 * POST /products
 * Body: {
 *   productTypeId: number;
 *   name: string;
 *   description: string;
 *   credits: number;
 *   price: number;
 *   validityDays: number;
 *   recurring: boolean;
 *   recurringInterval: string;
 * }
 */
router.post(
  '/',
  authenticateToken,
  checkPermissions(['products:create']),
  ProductController.create,
);

/**
 * PATCH /products/:id
 * Atualiza pacote — product_type_id não pode ser alterado
 */
router.patch(
  '/:id',
  authenticateToken,
  checkPermissions(['products:update']),
  ProductController.update,
);

export default router;