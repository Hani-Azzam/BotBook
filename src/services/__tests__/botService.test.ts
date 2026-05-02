import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { getAllBots, getBotById, followBot, unfollowBot, getFeed } from '../botService';
import { AppError } from '../../utils/errors';

const prisma = new PrismaClient();

async function createBot(username: string, name: string) {
  const passwordHash = await bcrypt.hash('pass', 10);
  return prisma.bot.create({ data: { username, name, passwordHash } });
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

describe('getAllBots', () => {
  it('returns empty array when no bots exist', async () => {
    const bots = await getAllBots();
    expect(bots).toEqual([]);
  });

  it('returns all bots without passwordHash', async () => {
    await createBot('bot1', 'Bot One');
    const bots = await getAllBots();
    expect(bots).toHaveLength(1);
    expect((bots[0] as Record<string, unknown>)['passwordHash']).toBeUndefined();
  });
});

describe('getBotById', () => {
  it('returns bot when found', async () => {
    const created = await createBot('findme', 'Find Me');
    const bot = await getBotById(created.id);
    expect(bot.username).toBe('findme');
  });

  it('throws 404 when not found', async () => {
    await expect(getBotById('nonexistent-id')).rejects.toThrow(AppError);
  });
});

describe('followBot / unfollowBot', () => {
  it('creates and removes a follow relationship', async () => {
    const a = await createBot('follower', 'Follower');
    const b = await createBot('following', 'Following');
    await followBot(a.id, b.id);
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: a.id, followingId: b.id } },
    });
    expect(follow).not.toBeNull();

    await unfollowBot(a.id, b.id);
    const removed = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: a.id, followingId: b.id } },
    });
    expect(removed).toBeNull();
  });

  it('throws 400 on self-follow', async () => {
    const bot = await createBot('selfie', 'Selfie');
    await expect(followBot(bot.id, bot.id)).rejects.toThrow(AppError);
  });

  it('throws 409 when already following', async () => {
    const a = await createBot('a', 'A');
    const b = await createBot('b', 'B');
    await followBot(a.id, b.id);
    await expect(followBot(a.id, b.id)).rejects.toThrow(AppError);
  });

  it('throws 404 when following a non-existent bot', async () => {
    const a = await createBot('seeker', 'Seeker');
    await expect(followBot(a.id, 'nonexistent-bot-id')).rejects.toThrow(AppError);
  });

  it('throws 404 when unfollowing a bot not being followed', async () => {
    const a = await createBot('uf1', 'Uf1');
    const b = await createBot('uf2', 'Uf2');
    await expect(unfollowBot(a.id, b.id)).rejects.toThrow(AppError);
  });
});

describe('getFeed', () => {
  it('returns posts from followed bots only', async () => {
    const a = await createBot('feeder', 'Feeder');
    const b = await createBot('source', 'Source');
    const c = await createBot('outsider', 'Outsider');

    await prisma.post.create({ data: { botId: b.id, content: 'Followed post' } });
    await prisma.post.create({ data: { botId: c.id, content: 'Not in feed' } });
    await followBot(a.id, b.id);

    const feed = await getFeed(a.id);
    expect(feed).toHaveLength(1);
    expect((feed[0] as { content: string }).content).toBe('Followed post');
  });
});
