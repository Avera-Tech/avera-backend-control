import { Router } from 'express';
import studentAuthRoutes from './studentAuth.routes';

const router = Router();

router.use('/auth', studentAuthRoutes);

export default router;
