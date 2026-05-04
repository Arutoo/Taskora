import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { initSockets } from './sockets';
import { setSocketServer } from './utils/socketEmitter';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? '*',
    credentials: true,
  },
});

setSocketServer(io);
initSockets(io);

httpServer.listen(PORT, () => {
  console.log(`Taskora backend running on port ${PORT}`);
});

export default httpServer;
