import { Router } from 'express';
import { authenticateToken } from '../../../core/middleware/authenticateToken';
import {
  addToWaitingList,
  removeFromWaitingList,
  promoteFromWaitingList,
  getWaitingListByClass,
  getMyWaitingLists,
} from '../controllers/waitingListController';

const router = Router();

router.get('/waiting-list/me', authenticateToken, getMyWaitingLists);

router.post('/:classId/waiting-list', authenticateToken, addToWaitingList);
router.delete('/:classId/waiting-list', authenticateToken, removeFromWaitingList);
router.post('/:classId/waiting-list/promote', authenticateToken, promoteFromWaitingList);
router.get('/:classId/waiting-list', authenticateToken, getWaitingListByClass);

export default router;
