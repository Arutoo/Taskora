import * as contributionRepo from '../repositories/contribution.repository';

export async function getSummary(workspaceId: string) {
  const rows = await contributionRepo.getContributionsByWorkspace(workspaceId);

  const total = rows.reduce((sum, r) => sum + r.verified_tasks, 0);

  const result = rows.map((r, i) => {
    if (i === rows.length - 1 && total > 0) {
      const prevSum = rows.slice(0, i).reduce((s, x) => s + x.percentage, 0);
      return { ...r, percentage: Math.round((100 - prevSum) * 100) / 100 };
    }
    return r;
  });

  return { members: result, total_verified: total };
}
