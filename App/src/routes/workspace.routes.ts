import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { loadWorkspaceRole, requireMember, requireLeader } from '../middlewares/roleCheck';
import * as ctrl from '../controllers/workspace.controller';

const router = Router();

const wsRole = loadWorkspaceRole('id');

router.post('/', authenticate, ctrl.createWorkspace);
router.get('/', authenticate, ctrl.listWorkspaces);
router.get('/:id', authenticate, wsRole, requireMember, ctrl.getWorkspace);
router.patch('/:id', authenticate, wsRole, requireLeader, ctrl.updateWorkspace);
router.delete('/:id', authenticate, wsRole, requireLeader, ctrl.archiveWorkspace);

router.post('/:id/invite', authenticate, wsRole, requireLeader, ctrl.invite);
router.post('/:id/join', authenticate, ctrl.joinWorkspace);
router.delete('/:id/members/:userId', authenticate, wsRole, requireLeader, ctrl.removeMember);

export default router;
