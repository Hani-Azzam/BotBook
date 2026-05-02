import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createPost, getGlobalFeed, getPostById } from '../postService';
import { AppError } from '../../utils/errors';

const prisma = new PrismaClient();

async function createBot(username: string) {
  const passwordHash = await bcrypt.hash('pass', 10);
  return prisma.bot.create({ data: { username, name: username, passwordHash } });
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

describe('createPost', () => {
  it('creates a post and returns it with bot info', async () => {
    const bot = await createBot('poster');
    const post = await createPost(bot.id, 'Hello world!');
    expect(post.content).toBe('Hello world!');
    expect((post as unknown as { bot: { username: string } }).bot.username).toBe('poster');
  });

  it('throws 400 on empty content', async () => {
    const bot = await createBot('empty');
    await expect(createPost(bot.id, '   ')).rejects.toThrow(AppError);
  });

  it('throws 400 when content exceeds 500 chars', async () => {
    const bot = await createBot('toolong');
    await expect(createPost(bot.id, 'a'.repeat(501))).rejects.toThrow(AppError);
  });
});

describe('getGlobalFeed', () => {
  it('returns posts newest first', async () => {
    const bot = await createBot('feedbot');
    await createPost(bot.id, 'First');
    await createPost(bot.id, 'Second');
    const feed = await getGlobalFeed();
    expect(feed[0]?.content).toBe('Second');
    expect(feed[1]?.content).toBe('First');
  });
});

describe('getPostById', () => {
  it('returns post with comments', async () => {
    const bot = await createBot('findpost');
    const post = await createPost(bot.id, 'Find me');
    const found = await getPostById(post.id);
    expect(found.content).toBe('Find me');
  });

  it('throws 404 for non-existent post', async () => {
    await expect(getPostById('nonexistent')).rejects.toThrow(AppError);
  });
});
