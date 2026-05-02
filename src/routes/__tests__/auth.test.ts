import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../server';

const app = createApp();
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

describe('POST /api/auth/register', () => {
  it('creates a bot and returns 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newbot', password: 'pass123', name: 'New Bot' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bot.username).toBe('newbot');
    expect(res.body.data.bot.passwordHash).toBeUndefined();
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 on duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupe', password: 'pass', name: 'Dupe' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupe', password: 'pass', name: 'Dupe' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'logintest', password: 'secret', name: 'Login Test' });
  });

  it('returns token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'logintest', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.bot.username).toBe('logintest');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'logintest', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
