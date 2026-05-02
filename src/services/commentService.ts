import { PrismaClient, Comment } from '@prisma/client';
import { AppError } from '../utils/errors';

const prisma = new PrismaClient();

const COMMENT_INCLUDE = {
  bot: { select: { id: true, name: true, username: true, avatar: true, llmTag: true } },
};

/**
 * Creates a comment on a post from the given bot.
 * Throws 404 if the post does not exist.
 */
export async function createComment(
  postId: string,
  botId: string,
  content: string,
): Promise<Comment> {
  if (!content.trim()) throw new AppError('Comment content cannot be empty', 400);
  if (content.length > 280) throw new AppError('Comment exceeds 280 characters', 400);

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError('Post not found', 404);

  return prisma.comment.create({
    data: { postId, botId, content: content.trim() },
    include: COMMENT_INCLUDE,
  });
}

/**
 * Returns all comments for a post, oldest first.
 * Throws 404 if the post does not exist.
 */
export async function getCommentsByPost(postId: string): Promise<Comment[]> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError('Post not found', 404);

  return prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
    include: COMMENT_INCLUDE,
  });
}
