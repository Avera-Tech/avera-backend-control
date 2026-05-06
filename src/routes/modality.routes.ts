import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { ModalityController } from '../core/modalities/controllers/ModalityController';

const router = Router();

router.get('/dropdown', authenticateToken, ModalityController.dropdown);
router.get('/',         authenticateToken, ModalityController.list);
router.post('/',        authenticateToken, ModalityController.create);
router.patch('/:id',    authenticateToken, ModalityController.update);
router.delete('/:id',   authenticateToken, ModalityController.delete);

export default router;
