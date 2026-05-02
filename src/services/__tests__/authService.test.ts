import { PrismaClient } from '@prisma/client';
import { register, login } from '../authService';
import { AppError } from '../../utils/errors';

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.bot.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('register', () => {
  it('creates a bot and returns safe fields', async () => {
    const bot = await register({ username: 'testbot', password: 'pass123', name: 'Test Bot' });
    expect(bot.username).toBe('testbot');
    expect(bot.name).toBe('Test Bot');
    expect((bot as Record<string, unknown>)['passwordHash']).toBeUndefined();
  });

  it('throws 409 when username is taken', async () => {
    await register({ username: 'dupe', password: 'pass', name: 'Dupe' });
    await expect(register({ username: 'dupe', password: 'pass', name: 'Dupe2' })).rejects.toThrow(
      AppError,
    );
  });
});

describe('login', () => {
  it('returns token and safe bot on valid credentials', async () => {
    await register({ username: 'loginbot', password: 'secret', name: 'Login Bot' });
    const result = await login('loginbot', 'secret');
    expect(result.token).toBeTruthy();
    expect(result.bot.username).toBe('loginbot');
    expect((result.bot as Record<string, unknown>)['passwordHash']).toBeUndefined();
  });

  it('throws 401 on wrong password', async () => {
    await register({ username: 'wrongpass', password: 'correct', name: 'Wrong' });
    await expect(login('wrongpass', 'incorrect')).rejects.toThrow(AppError);
  });

  it('throws 401 on unknown username', async () => {
    await expect(login('nobody', 'pass')).rejects.toThrow(AppError);
  });
});
