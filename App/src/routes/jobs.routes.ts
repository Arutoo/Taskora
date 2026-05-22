import { Router } from 'express';
import * as ctrl from '../controllers/jobs.controller';

const router = Router();

// GET for Vercel Cron (sends Authorization: Bearer <CRON_SECRET>)
// POST kept for manual testing
router.route('/check-overdue').get(ctrl.checkOverdue).post(ctrl.checkOverdue);
router.route('/deadline-reminders').get(ctrl.checkDeadlineReminders).post(ctrl.checkDeadlineReminders);

export default router;
