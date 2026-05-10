import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { LevelController } from '../core/levels/controllers/LevelController';

const router = Router();

router.get('/dropdown', authenticateToken, LevelController.dropdown);
router.get('/',         authenticateToken, LevelController.list);
router.post('/',        authenticateToken, LevelController.create);
router.patch('/:id',    authenticateToken, LevelController.update);
router.delete('/:id',   authenticateToken, LevelController.delete);

export default router;
