import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { loadWorkspaceRole, requireMember, requireLeader } from '../middlewares/roleCheck';
import * as ctrl from '../controllers/workspace.controller';
import * as taskCtrl from '../controllers/task.controller';
import * as contributionCtrl from '../controllers/contribution.controller';
import * as activityCtrl from '../controllers/activityLog.controller';
import * as shortcutCtrl from '../controllers/shortcut.controller';

const router = Router();
const wsRole = loadWorkspaceRole('id');

// Workspace CRUD
router.post('/', authenticate, ctrl.createWorkspace);
router.get('/', authenticate, ctrl.listWorkspaces);
router.get('/:id', authenticate, wsRole, requireMember, ctrl.getWorkspace);
router.patch('/:id', authenticate, wsRole, requireLeader, ctrl.updateWorkspace);
router.delete('/:id', authenticate, wsRole, requireLeader, ctrl.archiveWorkspace);

// Membership
router.post('/:id/invite', authenticate, wsRole, requireLeader, ctrl.invite);
router.post('/:id/join', authenticate, ctrl.joinWorkspace);
router.post('/:id/leave', authenticate, wsRole, requireMember, ctrl.leaveWorkspace);
router.patch('/:id/transfer', authenticate, wsRole, requireLeader, ctrl.transferOwnership);
router.delete('/:id/members/:userId', authenticate, wsRole, requireLeader, ctrl.removeMember);

// Tasks
router.post('/:id/tasks', authenticate, wsRole, requireLeader, taskCtrl.createTask);
router.get('/:id/tasks', authenticate, wsRole, requireMember, taskCtrl.listTasks);
router.get('/:id/tasks/:taskId', authenticate, wsRole, requireMember, taskCtrl.getTask);
router.patch('/:id/tasks/:taskId', authenticate, wsRole, requireLeader, taskCtrl.editTask);
router.delete('/:id/tasks/:taskId', authenticate, wsRole, requireLeader, taskCtrl.deleteTask);
router.patch('/:id/tasks/:taskId/status', authenticate, wsRole, requireMember, taskCtrl.updateStatus);
router.patch('/:id/tasks/:taskId/verify', authenticate, wsRole, requireLeader, taskCtrl.verifyTask);
router.patch('/:id/tasks/:taskId/unverify', authenticate, wsRole, requireLeader, taskCtrl.unverifyTask);

// Calendar
router.get('/:id/calendar', authenticate, wsRole, requireMember, taskCtrl.getCalendar);

// Contributions
router.get('/:id/contributions', authenticate, wsRole, requireMember, contributionCtrl.getContributions);

// Activity log
router.get('/:id/activity', authenticate, wsRole, requireMember, activityCtrl.getLogs);

// Shortcuts
router.post('/:id/shortcuts', authenticate, wsRole, requireMember, shortcutCtrl.addShortcut);
router.get('/:id/shortcuts', authenticate, wsRole, requireMember, shortcutCtrl.listShortcuts);
router.delete('/:id/shortcuts/:sid', authenticate, wsRole, requireMember, shortcutCtrl.deleteShortcut);

export default router;
