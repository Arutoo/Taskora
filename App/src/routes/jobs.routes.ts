import { Router } from 'express';
import * as ctrl from '../controllers/jobs.controller';

const router = Router();

router.post('/check-overdue', ctrl.checkOverdue);
router.post('/deadline-reminders', ctrl.checkDeadlineReminders);

export default router;
