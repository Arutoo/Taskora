import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { loadWorkspaceRole, requireMember, requireLeader } from '../middlewares/roleCheck';
import * as ctrl from '../controllers/workspace.controller';
import * as taskCtrl from '../controllers/task.controller';

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

router.post('/:id/tasks', authenticate, wsRole, requireLeader, taskCtrl.createTask);
router.get('/:id/tasks', authenticate, wsRole, requireMember, taskCtrl.listTasks);
router.get('/:id/tasks/:taskId', authenticate, wsRole, requireMember, taskCtrl.getTask);
router.patch('/:id/tasks/:taskId', authenticate, wsRole, requireLeader, taskCtrl.editTask);
router.delete('/:id/tasks/:taskId', authenticate, wsRole, requireLeader, taskCtrl.deleteTask);
router.patch('/:id/tasks/:taskId/status', authenticate, wsRole, requireMember, taskCtrl.updateStatus);
router.patch('/:id/tasks/:taskId/verify', authenticate, wsRole, requireLeader, taskCtrl.verifyTask);

export default router;
