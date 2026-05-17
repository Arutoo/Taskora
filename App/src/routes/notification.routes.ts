import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as ctrl from '../controllers/notification.controller';

const router = Router();

router.get('/', authenticate, ctrl.listNotifications);
router.patch('/read-all', authenticate, ctrl.markAllRead);
router.patch('/:id/read', authenticate, ctrl.markRead);

export default router;
