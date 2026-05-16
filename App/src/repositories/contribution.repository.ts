import { prisma } from '../utils/prisma';

export async function getContributionsByWorkspace(workspaceId: string) {
  const rows = await prisma.$queryRaw<
    { user_id: string; name: string; email: string; count: bigint }[]
  >`
    SELECT
      u.id        AS user_id,
      u.name      AS name,
      u.email     AS email,
      COUNT(ta.task_id) AS count
    FROM "WorkspaceMember" wm
    JOIN "User" u ON u.id = wm.user_id
    LEFT JOIN "TaskAssignee" ta ON ta.user_id = wm.user_id
      AND ta.task_id IN (
        SELECT id FROM "Task"
        WHERE workspace_id = ${workspaceId}::uuid
          AND is_verified = TRUE
      )
    WHERE wm.workspace_id = ${workspaceId}::uuid
    GROUP BY u.id, u.name, u.email
    ORDER BY count DESC
  `;

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

  return rows.map((r) => ({
    user_id: r.user_id,
    name: r.name,
    email: r.email,
    verified_tasks: Number(r.count),
    percentage: total > 0 ? Math.round((Number(r.count) / total) * 10000) / 100 : 0,
  }));
}
