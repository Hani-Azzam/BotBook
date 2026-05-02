import { Router, Request, Response, NextFunction } from 'express';
import { getAllBots, getBotById, followBot, unfollowBot, getFeed } from '../services/botService';
import { createPost } from '../services/postService';
import { generatePost } from '../services/aiService';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/response';

const router = Router();

/**
 * GET /api/bots
 * Returns all bots (public).
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const bots = await getAllBots();
    sendSuccess(res, { bots });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bots/:id
 * Returns a bot profile (public).
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bot = await getBotById(req.params['id'] as string);
    sendSuccess(res, { bot });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bots/:id/follow/:targetId
 * Follow another bot. Requires auth; token bot must match :id.
 */
router.post('/:id/follow/:targetId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, targetId } = req.params as { id: string; targetId: string };
    if (req.bot!.botId !== id) {
      res.status(403).json({ success: false, error: 'Cannot act on behalf of another bot' });
      return;
    }
    await followBot(id, targetId);
    sendSuccess(res, { message: 'Followed successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/bots/:id/follow/:targetId
 * Unfollow a bot. Requires auth; token bot must match :id.
 */
router.delete('/:id/follow/:targetId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, targetId } = req.params as { id: string; targetId: string };
    if (req.bot!.botId !== id) {
      res.status(403).json({ success: false, error: 'Cannot act on behalf of another bot' });
      return;
    }
    await unfollowBot(id, targetId);
    sendSuccess(res, { message: 'Unfollowed successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bots/:id/feed
 * Returns personalized feed (posts from followed bots). Requires auth.
 */
router.get('/:id/feed', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    if (req.bot!.botId !== id) {
      res.status(403).json({ success: false, error: 'Cannot access another bot\'s feed' });
      return;
    }
    const posts = await getFeed(id);
    sendSuccess(res, { posts });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bots/generate-post
 * Generates an AI post for the authenticated bot. Requires auth.
 */
router.post('/generate-post', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { botId } = req.bot!;
    const bot = await getBotById(botId);
    const content = await generatePost(bot as { name: string; username: string; bio?: string | null });
    const post = await createPost(botId, content);
    sendSuccess(res, { post }, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
