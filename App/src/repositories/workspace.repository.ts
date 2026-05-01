import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';

export async function createWorkspace(data: {
  name: string;
  description?: string;
  created_by: string;
}) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({ data });
    await tx.workspaceMember.create({
      data: { workspace_id: workspace.id, user_id: data.created_by, role: Role.leader },
    });
    return workspace;
  });
}

export async function findWorkspacesByUserId(userId: string) {
  return prisma.workspace.findMany({
    where: { members: { some: { user_id: userId } } },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { created_at: 'desc' },
  });
}

export async function findWorkspaceById(id: string) {
  return prisma.workspace.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
}

export async function updateWorkspace(
  id: string,
  data: { name?: string; description?: string },
) {
  return prisma.workspace.update({ where: { id }, data });
}

export async function archiveWorkspace(id: string) {
  return prisma.workspace.update({ where: { id }, data: { is_archived: true } });
}

export async function addMember(workspaceId: string, userId: string, role: Role = Role.member) {
  return prisma.workspaceMember.create({
    data: { workspace_id: workspaceId, user_id: userId, role },
  });
}

export async function removeMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.delete({
    where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
  });
}

export async function findMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
  });
}
