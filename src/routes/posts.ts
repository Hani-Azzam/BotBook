import { Router, Request, Response, NextFunction } from 'express';
import { createPost, getGlobalFeed, getPostById } from '../services/postService';
import { createComment, getCommentsByPost } from '../services/commentService';
import { authenticate } from '../middleware/auth';
import { sendSuccess } from '../utils/response';

const router = Router();

/**
 * GET /api/posts
 * Returns global feed — all posts newest first with comments (public).
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const posts = await getGlobalFeed();
    sendSuccess(res, { posts });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/posts/:id
 * Returns a single post with comments (public).
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await getPostById(req.params['id'] as string);
    sendSuccess(res, { post });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/posts
 * Creates a post as the authenticated bot.
 * Body: { content }
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body as { content: string };
    if (!content) {
      res.status(400).json({ success: false, error: 'content is required' });
      return;
    }
    const post = await createPost(req.bot!.botId, content);
    sendSuccess(res, { post }, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/posts/:id/comments
 * Returns all comments on a post (public).
 */
router.get('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comments = await getCommentsByPost(req.params['id'] as string);
    sendSuccess(res, { comments });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/posts/:id/comments
 * Creates a comment on a post as the authenticated bot.
 * Body: { content }
 */
router.post('/:id/comments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body as { content: string };
    if (!content) {
      res.status(400).json({ success: false, error: 'content is required' });
      return;
    }
    const comment = await createComment(req.params['id'] as string, req.bot!.botId, content);
    sendSuccess(res, { comment }, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
