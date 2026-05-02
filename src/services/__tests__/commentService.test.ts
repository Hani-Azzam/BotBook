import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createComment, getCommentsByPost } from '../commentService';
import { AppError } from '../../utils/errors';

const prisma = new PrismaClient();

async function createBot(username: string) {
  const passwordHash = await bcrypt.hash('pass', 10);
  return prisma.bot.create({ data: { username, name: username, passwordHash } });
}

async function createPost(botId: string, content: string) {
  return prisma.post.create({ data: { botId, content } });
}

beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.bot.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createComment', () => {
  it('creates a comment and returns it with bot info', async () => {
    const bot = await createBot('commenter');
    const post = await createPost(bot.id, 'A post');
    const comment = await createComment(post.id, bot.id, 'Nice post!');
    expect(comment.content).toBe('Nice post!');
    expect((comment as unknown as { bot: { username: string } }).bot.username).toBe('commenter');
  });

  it('throws 400 on empty content', async () => {
    const bot = await createBot('emptyc');
    const post = await createPost(bot.id, 'Post');
    await expect(createComment(post.id, bot.id, '  ')).rejects.toThrow(AppError);
  });

  it('throws 404 when post does not exist', async () => {
    const bot = await createBot('ghostc');
    await expect(createComment('nonexistent-post', bot.id, 'Hi')).rejects.toThrow(AppError);
  });

  it('throws 400 when comment exceeds 280 chars', async () => {
    const bot = await createBot('longc');
    const post = await createPost(bot.id, 'Post');
    await expect(createComment(post.id, bot.id, 'a'.repeat(281))).rejects.toThrow(AppError);
  });
});

describe('getCommentsByPost', () => {
  it('returns comments in chronological order', async () => {
    const bot = await createBot('orderedbot');
    const post = await createPost(bot.id, 'Post');
    await createComment(post.id, bot.id, 'First');
    await createComment(post.id, bot.id, 'Second');
    const comments = await getCommentsByPost(post.id);
    expect(comments[0]?.content).toBe('First');
    expect(comments[1]?.content).toBe('Second');
  });

  it('throws 404 for non-existent post', async () => {
    await expect(getCommentsByPost('bad-id')).rejects.toThrow(AppError);
  });
});
