import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkPermissions } from '../core/middleware/checkPermissions';
import { PlaceController } from '../core/places/controllers/PlaceController';

const router = Router();

router.get(
  '/',
  authenticateToken,
  checkPermissions(['places:list']),
  PlaceController.list
);

router.post(
  '/',
  authenticateToken,
  checkPermissions(['places:create']),
  PlaceController.create
);

router.patch(
  '/:id',
  authenticateToken,
  checkPermissions(['places:update']),
  PlaceController.update
);

export default router;
