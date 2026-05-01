import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const v1 = '/api/v1';
app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/workspaces`, workspaceRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, message: 'Route not found' });
});

app.use(errorHandler);

export default app;
