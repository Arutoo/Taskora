import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { loadWorkspaceRoleFromTask, requireMember } from '../middlewares/roleCheck';
import * as ctrl from '../controllers/comment.controller';

const router = Router({ mergeParams: true });

const wsRole = loadWorkspaceRoleFromTask();

router.post('/', authenticate, wsRole, requireMember, ctrl.postComment);
router.get('/', authenticate, wsRole, requireMember, ctrl.listComments);
router.patch('/:id', authenticate, wsRole, requireMember, ctrl.editComment);
router.delete('/:id', authenticate, wsRole, requireMember, ctrl.deleteComment);

export default router;
