import { AppError } from '../types';
import { signInviteToken, verifyInviteToken } from '../utils/jwt';
import * as workspaceRepo from '../repositories/workspace.repository';
import * as userRepo from '../repositories/user.repository';

export async function createWorkspace(
  userId: string,
  name: string,
  description?: string,
) {
  return workspaceRepo.createWorkspace({ name, description, created_by: userId });
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
  return workspaceRepo.archiveWorkspace(workspaceId);
}

export async function generateInviteLink(workspaceId: string, invitedBy: string): Promise<string> {
  return signInviteToken({ workspaceId, invitedBy });
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

  return { message: 'User added to workspace', userId: user.id };
}

export async function joinViaToken(token: string, userId: string) {
  const payload = verifyInviteToken(token);

  const ws = await workspaceRepo.findWorkspaceById(payload.workspaceId);
  if (!ws) throw new AppError('Workspace not found', 404);
  if (ws.is_archived) throw new AppError('Workspace is archived', 410);

  const existing = await workspaceRepo.findMember(payload.workspaceId, userId);
  if (existing) throw new AppError('Already a member of this workspace', 409);

  await workspaceRepo.addMember(payload.workspaceId, userId);

  return ws;
}

export async function removeMember(workspaceId: string, targetUserId: string, leaderId: string) {
  if (targetUserId === leaderId) throw new AppError('Leader cannot remove themselves', 400);

  const member = await workspaceRepo.findMember(workspaceId, targetUserId);
  if (!member) throw new AppError('Member not found', 404);

  return workspaceRepo.removeMember(workspaceId, targetUserId);
}
