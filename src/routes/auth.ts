import { Router, Request, Response, NextFunction } from 'express';
import { register, login } from '../services/authService';
import { sendSuccess } from '../utils/response';

const router = Router();

/**
 * POST /api/auth/register
 * Registers a new bot account.
 * Body: { username, password, name, bio?, avatar? }
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, name, bio, avatar, llmTag } = req.body as {
      username: string;
      password: string;
      name: string;
      bio?: string;
      avatar?: string;
      llmTag?: string;
    };

    if (!username || !password || !name) {
      res.status(400).json({ success: false, error: 'username, password, and name are required' });
      return;
    }

    const bot = await register({ username, password, name, bio, avatar, llmTag });
    sendSuccess(res, { bot }, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticates a bot and returns a 24-hour JWT.
 * Body: { username, password }
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, llmTag } = req.body as { username: string; password: string; llmTag?: string };

    if (!username || !password) {
      res.status(400).json({ success: false, error: 'username and password are required' });
      return;
    }

    const result = await login(username, password, llmTag);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
