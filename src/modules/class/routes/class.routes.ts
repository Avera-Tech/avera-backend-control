import { Router } from 'express';
import { authenticateToken } from '../../../core/middleware/authenticateToken';
import {
  listClasses,
  createClass,
  getClassById,
  updateClass,
  cancelClass,
  deleteClass,
} from '../controllers/classController';
import {
  listEnrollments,
  enrollStudent,
  cancelEnrollment,
  checkinByEnrollmentId,
  checkinByStudentPair,
} from '../controllers/classStudentController';

const router = Router();

router.get('/', authenticateToken, listClasses);
router.post('/', authenticateToken, createClass);
router.get('/:id', authenticateToken, getClassById);
router.patch('/:id', authenticateToken, updateClass);
router.patch('/:id/cancel', authenticateToken, cancelClass);
router.delete('/:id', authenticateToken, deleteClass);

router.get('/:id/enrollments', authenticateToken, listEnrollments);
router.post('/:id/enroll', authenticateToken, enrollStudent);
router.patch('/:classId/enroll/:enrollmentId/cancel', authenticateToken, cancelEnrollment);
router.patch('/:classId/checkin/:enrollmentId', authenticateToken, checkinByEnrollmentId);
router.post('/:classId/checkin', authenticateToken, checkinByStudentPair);

export default router;
