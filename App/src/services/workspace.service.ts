import { randomBytes } from 'crypto';
import { AppError } from '../types';
import * as workspaceRepo from '../repositories/workspace.repository';
import * as userRepo from '../repositories/user.repository';
import * as notificationService from './notification.service';
import * as activityLogService from './activityLog.service';
import * as contributionService from './contribution.service';
import { NotificationType, ReferenceType, Role } from '@prisma/client';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from(randomBytes(8)).map(b => chars[b % chars.length]).join('');
}

export async function createWorkspace(
  userId: string,
  name: string,
  description?: string,
) {
  const workspace = await workspaceRepo.createWorkspace({ name, description, created_by: userId });

  await activityLogService.log({
    workspace_id: workspace.id,
    user_id: userId,
    action_type: 'member_joined',
    reference_id: workspace.id,
    reference_type: ReferenceType.workspace,
  });

  return workspace;
}

export async function listWorkspaces(userId: string) {
  return workspaceRepo.findWorkspacesByUserId(userId);
}

export async function getWorkspace(workspaceId: string) {
  const ws = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!ws) throw new AppError('Workspace not found', 404);
  return ws;
}

export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; description?: string },
) {
  const ws = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!ws) throw new AppError('Workspace not found', 404);
  return workspaceRepo.updateWorkspace(workspaceId, data);
}

export async function archiveWorkspace(workspaceId: string) {
  const ws = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!ws) throw new AppError('Workspace not found', 404);
  const archived = await workspaceRepo.archiveWorkspace(workspaceId);
  const contributions = await contributionService.getSummary(workspaceId);
  return { workspace: archived, final_contributions: contributions };
}

export async function generateInviteLink(workspaceId: string, _invitedBy: string): Promise<string> {
  const code = generateInviteCode();
  await workspaceRepo.setInviteCode(workspaceId, code);
  return code;
}

export async function inviteByEmail(
  workspaceId: string,
  invitedBy: string,
  email: string,
) {
  const user = await userRepo.findUserByEmail(email);
  if (!user) throw new AppError('No registered user with that email', 404);

  const existing = await workspaceRepo.findMember(workspaceId, user.id);
  if (existing) throw new AppError('User is already a member of this workspace', 409);

  await workspaceRepo.addMember(workspaceId, user.id);

  await activityLogService.log({
    workspace_id: workspaceId,
    user_id: user.id,
    action_type: 'member_joined',
    reference_id: workspaceId,
    reference_type: ReferenceType.workspace,
  });

  await notificationService.createAndPush({
    user_id: user.id,
    type: NotificationType.invited,
    message: `You have been added to a workspace`,
    reference_id: workspaceId,
    reference_type: ReferenceType.workspace,
  });

  return { message: 'User added to workspace', userId: user.id };
}

export async function joinViaCode(code: string, userId: string) {
  const ws = await workspaceRepo.findWorkspaceByInviteCode(code.toUpperCase());
  if (!ws) throw new AppError('Invalid invite code', 404);
  if (ws.is_archived) throw new AppError('Workspace is archived', 410);

  const existing = await workspaceRepo.findMember(ws.id, userId);
  if (existing) throw new AppError('Already a member of this workspace', 409);

  await workspaceRepo.addMember(ws.id, userId);

  await activityLogService.log({
    workspace_id: ws.id,
    user_id: userId,
    action_type: 'member_joined',
    reference_id: ws.id,
    reference_type: ReferenceType.workspace,
  });

  return ws;
}

export async function leaveWorkspace(workspaceId: string, userId: string) {
  const member = await workspaceRepo.findMember(workspaceId, userId);
  if (!member) throw new AppError('Not a member of this workspace', 404);

  if (member.role === Role.leader) {
    const leaderCount = await workspaceRepo.countLeaders(workspaceId);
    if (leaderCount <= 1) {
      throw new AppError('You are the sole leader. Transfer ownership to another member before leaving.', 400);
    }
  }

  return workspaceRepo.removeMember(workspaceId, userId);
}

export async function transferOwnership(workspaceId: string, leaderId: string, newLeaderId: string) {
  if (leaderId === newLeaderId) throw new AppError('You are already the leader', 400);

  const target = await workspaceRepo.findMember(workspaceId, newLeaderId);
  if (!target) throw new AppError('Target user is not a workspace member', 404);

  await workspaceRepo.updateMemberRole(workspaceId, newLeaderId, Role.leader);
  await workspaceRepo.updateMemberRole(workspaceId, leaderId, Role.member);

  return { message: 'Ownership transferred successfully' };
}

export async function removeMember(workspaceId: string, targetUserId: string, leaderId: string) {
  if (targetUserId === leaderId) throw new AppError('Leader cannot remove themselves', 400);

  const member = await workspaceRepo.findMember(workspaceId, targetUserId);
  if (!member) throw new AppError('Member not found', 404);

  return workspaceRepo.removeMember(workspaceId, targetUserId);
}
