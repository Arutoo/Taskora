import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import commentRoutes from './routes/comment.routes';
import notificationRoutes from './routes/notification.routes';
import jobRoutes from './routes/jobs.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? '*', credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// API routes
const v1 = '/api/v1';
app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/workspaces`, workspaceRoutes);
app.use(`${v1}/tasks/:taskId/comments`, commentRoutes);
app.use(`${v1}/notifications`, notificationRoutes);
app.use(`${v1}/jobs`, jobRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, message: 'Route not found' });
});

app.use(errorHandler);

export default app;
