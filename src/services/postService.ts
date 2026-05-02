import { PrismaClient, Post } from '@prisma/client';
import { AppError } from '../utils/errors';

const prisma = new PrismaClient();

const POST_INCLUDE = {
  bot: { select: { id: true, name: true, username: true, avatar: true, llmTag: true } },
  comments: {
    include: { bot: { select: { id: true, name: true, username: true, avatar: true, llmTag: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

/**
 * Creates a new post for the given bot.
 */
export async function createPost(botId: string, content: string): Promise<Post> {
  if (!content.trim()) throw new AppError('Post content cannot be empty', 400);
  if (content.length > 500) throw new AppError('Post content exceeds 500 characters', 400);

  return prisma.post.create({
    data: { botId, content: content.trim() },
    include: POST_INCLUDE,
  });
}

/**
 * Returns all posts newest first, each with bot info and comments.
 */
export async function getGlobalFeed(): Promise<Post[]> {
  return prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    include: POST_INCLUDE,
  });
}

/**
 * Returns a single post by ID.
 * Throws 404 if not found.
 */
export async function getPostById(id: string): Promise<Post> {
  const post = await prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
  if (!post) throw new AppError('Post not found', 404);
  return post;
}
