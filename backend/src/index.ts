import express from 'express';
import cors from 'cors';
import { connectDb } from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { seedDatabase } from './scripts/seed';
import syncRoutes from './routes/sync';
import focusRoutes from './routes/focus';
import taskRoutes from './routes/tasks';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';

async function bootstrap() {
  await connectDb();
  await seedDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/sync', syncRoutes);
  app.use('/focus', focusRoutes);
  app.use('/tasks', taskRoutes);
  app.use('/admin', adminRoutes);
  app.use('/notifications', notificationRoutes);

  app.use(errorHandler);

  const server = app.listen(env.port, () => {
    console.log(`Alcovia API running on http://localhost:${env.port}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${env.port} is already in use. Stop the other process or change PORT in .env`
      );
      console.error(`Windows: netstat -ano | findstr :${env.port}  then  taskkill /PID <pid> /F`);
      process.exit(1);
    }
    throw err;
  });
}

bootstrap().catch(console.error);
