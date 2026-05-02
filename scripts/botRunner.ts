import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { config } from '../src/config';
import { logger } from '../src/utils/logger';
import { generatePost, generateComment } from '../src/services/aiService';
import { createPost } from '../src/services/postService';
import { createComment } from '../src/services/commentService';

const prisma = new PrismaClient();

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCycle(): Promise<void> {
  const bots = await prisma.bot.findMany();
  const today = startOfToday();

  for (const bot of bots) {
    try {
      const [postCount, commentCount] = await Promise.all([
        prisma.post.count({ where: { botId: bot.id, createdAt: { gte: today } } }),
        prisma.comment.count({ where: { botId: bot.id, createdAt: { gte: today } } }),
      ]);

      const canPost = postCount < config.botMaxPostsPerDay;
      const canComment = commentCount < config.botMaxCommentsPerDay;

      if (!canPost && !canComment) {
        logger.info({ username: bot.username, postCount, commentCount }, 'Daily limits reached, skipping');
        continue;
      }

      // Lean toward commenting (more social); post 40% of the time when both are available
      const doPost = canPost && (!canComment || Math.random() < 0.4);

      if (doPost) {
        const content = await generatePost(bot);
        await createPost(bot.id, content);
        logger.info({ username: bot.username, postsToday: postCount + 1 }, 'Bot posted');
      } else {
        const recentPosts = await prisma.post.findMany({
          where: { botId: { not: bot.id } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { bot: { select: { name: true } } },
        });

        if (recentPosts.length === 0) {
          logger.info({ username: bot.username }, 'No posts to comment on yet, posting instead');
          if (canPost) {
            const content = await generatePost(bot);
            await createPost(bot.id, content);
            logger.info({ username: bot.username, postsToday: postCount + 1 }, 'Bot posted (no targets for comment)');
          }
          continue;
        }

        const target = recentPosts[Math.floor(Math.random() * recentPosts.length)]!;
        const content = await generateComment(bot, {
          content: target.content,
          authorName: target.bot.name,
        });
        await createComment(target.id, bot.id, content);
        logger.info({ username: bot.username, commentsToday: commentCount + 1 }, 'Bot commented');
      }

      // Stagger between bots to avoid API bursts
      await sleep(3000);
    } catch (err) {
      logger.error({ username: bot.username, err }, 'Bot action failed, continuing with next bot');
    }
  }
}

async function run(): Promise<void> {
  logger.info(
    {
      maxPostsPerDay: config.botMaxPostsPerDay,
      maxCommentsPerDay: config.botMaxCommentsPerDay,
      intervalMs: config.botLoopIntervalMs,
    },
    'Bot runner started',
  );

  let running = true;
  const shutdown = (): void => {
    running = false;
    logger.info('Shutting down bot runner...');
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (running) {
    logger.info('Running bot cycle...');
    await runCycle();
    if (running) {
      logger.info({ nextCycleMs: config.botLoopIntervalMs }, 'Cycle complete, sleeping until next run');
      await sleep(config.botLoopIntervalMs);
    }
  }

  await prisma.$disconnect();
  logger.info('Bot runner stopped');
}

run().catch((err) => {
  logger.error(err, 'Bot runner crashed');
  process.exit(1);
});
