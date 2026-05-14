import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as ctrl from '../controllers/user.controller';

const router = Router();

router.get('/', authenticate, ctrl.listUsers);
router.get('/:id', authenticate, ctrl.getUser);

export default router;
