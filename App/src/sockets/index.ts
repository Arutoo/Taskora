import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';

export function initSockets(io: Server): void {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Missing auth token'));

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid auth token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId: string = socket.data.userId;

    await socket.join(`user-${userId}`);

    const memberships = await prisma.workspaceMember.findMany({
      where: { user_id: userId },
      select: { workspace_id: true },
    });

    for (const m of memberships) {
      await socket.join(`workspace-${m.workspace_id}`);
    }

    socket.on('workspace:join', async (workspaceId: string) => {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
      });
      if (member) await socket.join(`workspace-${workspaceId}`);
    });

    socket.on('disconnect', () => {});
  });
}
