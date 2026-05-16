import { prisma } from '../utils/prisma';

export async function createShortcut(data: {
  workspace_id: string;
  added_by: string;
  label: string;
  url: string;
}) {
  return prisma.resourceShortcut.create({
    data,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function findShortcutsByWorkspace(workspaceId: string) {
  return prisma.resourceShortcut.findMany({
    where: { workspace_id: workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { created_at: 'desc' },
  });
}

export async function findShortcutById(id: string) {
  return prisma.resourceShortcut.findUnique({ where: { id } });
}

export async function deleteShortcut(id: string) {
  return prisma.resourceShortcut.delete({ where: { id } });
}
