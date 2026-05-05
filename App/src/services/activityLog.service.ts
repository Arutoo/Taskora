import { ActionType, ReferenceType } from '@prisma/client';
import * as activityLogRepo from '../repositories/activityLog.repository';

export async function log(data: {
  workspace_id: string;
  user_id: string;
  action_type: ActionType;
  reference_id?: string;
  reference_type?: ReferenceType;
}) {
  return activityLogRepo.createLog(data);
}

export async function listLogs(workspaceId: string, page: number, limit: number) {
  return activityLogRepo.findLogsByWorkspace(workspaceId, page, limit);
}
