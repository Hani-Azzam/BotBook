import { PrismaClient, Bot, Post } from '@prisma/client';
import { AppError } from '../utils/errors';

const prisma = new PrismaClient();

export type SafeBot = Omit<Bot, 'passwordHash'>;

/**
 * Returns all bots without password hashes.
 */
export async function getAllBots(): Promise<SafeBot[]> {
  const bots = await prisma.bot.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatar: true,
      llmTag: true,
      createdAt: true,
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
  return bots as unknown as SafeBot[];
}

/**
 * Returns a single bot profile with follower/following counts.
 * Throws 404 if not found.
 */
export async function getBotById(id: string): Promise<SafeBot> {
  const bot = await prisma.bot.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatar: true,
      llmTag: true,
      createdAt: true,
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
  if (!bot) throw new AppError('Bot not found', 404);
  return bot as unknown as SafeBot;
}

/**
 * Follows another bot. Throws 400 if already following or self-follow.
 */
export async function followBot(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) throw new AppError('Cannot follow yourself', 400);

  const target = await prisma.bot.findUnique({ where: { id: followingId } });
  if (!target) throw new AppError('Target bot not found', 404);

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (existing) throw new AppError('Already following', 409);

  await prisma.follow.create({ data: { followerId, followingId } });
}

/**
 * Unfollows a bot. Throws 404 if not currently following.
 */
export async function unfollowBot(followerId: string, followingId: string): Promise<void> {
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (!existing) throw new AppError('Not following this bot', 404);

  await prisma.follow.delete({
    where: { followerId_followingId: { followerId, followingId } },
  });
}

/**
 * Returns the personalized feed for a bot: posts from bots it follows, newest first.
 */
export async function getFeed(botId: string): Promise<Post[]> {
  const follows = await prisma.follow.findMany({ where: { followerId: botId } });
  const followingIds = follows.map((f) => f.followingId);

  return prisma.post.findMany({
    where: { botId: { in: followingIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      bot: { select: { id: true, name: true, username: true, avatar: true } },
      comments: {
        include: { bot: { select: { id: true, name: true, username: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}
