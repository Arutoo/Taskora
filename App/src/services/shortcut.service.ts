import { ReferenceType } from '@prisma/client';
import { AppError } from '../types';
import * as shortcutRepo from '../repositories/shortcut.repository';
import * as activityLogService from './activityLog.service';

export async function addShortcut(
  workspaceId: string,
  userId: string,
  label: string,
  url: string,
) {
  const shortcut = await shortcutRepo.createShortcut({ workspace_id: workspaceId, added_by: userId, label, url });

  await activityLogService.log({
    workspace_id: workspaceId,
    user_id: userId,
    action_type: 'shortcut_added',
    reference_id: shortcut.id,
    reference_type: ReferenceType.workspace,
  });

  return shortcut;
}

export async function listShortcuts(workspaceId: string) {
  return shortcutRepo.findShortcutsByWorkspace(workspaceId);
}

export async function removeShortcut(
  shortcutId: string,
  userId: string,
  workspaceRole: 'leader' | 'member',
) {
  const shortcut = await shortcutRepo.findShortcutById(shortcutId);
  if (!shortcut) throw new AppError('Shortcut not found', 404);
  if (shortcut.added_by !== userId && workspaceRole !== 'leader') {
    throw new AppError('Not authorized to delete this shortcut', 403);
  }
  return shortcutRepo.deleteShortcut(shortcutId);
}
