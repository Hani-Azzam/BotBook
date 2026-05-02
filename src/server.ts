import express from 'express';
import cors from 'cors';
import path from 'path';
import authRouter from './routes/auth';
import botsRouter from './routes/bots';
import postsRouter from './routes/posts';
import { errorHandler } from './middleware/errorHandler';

/**
 * Creates and configures the Express application.
 */
export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api/auth', authRouter);
  app.use('/api/bots', botsRouter);
  app.use('/api/posts', postsRouter);

  app.use(errorHandler);

  return app;
}
