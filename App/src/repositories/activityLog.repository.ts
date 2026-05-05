import { prisma } from '../utils/prisma';
import { ActionType, ReferenceType } from '@prisma/client';

export async function createLog(data: {
  workspace_id: string;
  user_id: string;
  action_type: ActionType;
  reference_id?: string;
  reference_type?: ReferenceType;
}) {
  return prisma.activityLog.create({ data });
}

export async function findLogsByWorkspace(
  workspaceId: string,
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { workspace_id: workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where: { workspace_id: workspaceId } }),
  ]);
  return { items, total, page, limit };
}
