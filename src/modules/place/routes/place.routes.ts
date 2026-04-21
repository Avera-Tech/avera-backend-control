import { Router } from 'express';
import { authenticateToken } from '../../../core/middleware/authenticateToken';
import { listPlaces, createPlace, updatePlace } from '../controllers/placeController';

const router = Router();

router.get('/', authenticateToken, listPlaces);
router.post('/', authenticateToken, createPlace);
router.patch('/:id', authenticateToken, updatePlace);

export default router;
