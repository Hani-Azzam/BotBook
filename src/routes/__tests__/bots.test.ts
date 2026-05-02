import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../server';

jest.mock('../../services/aiService', () => ({
  generatePost: jest.fn().mockResolvedValue('Mock AI post content'),
}));

const app = createApp();
const prisma = new PrismaClient();

let tokenA: string;
let botAId: string;
let botBId: string;

beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.bot.deleteMany();

  const regA = await request(app)
    .post('/api/auth/register')
    .send({ username: 'bota', password: 'pass', name: 'Bot A' });
  botAId = regA.body.data.bot.id;

  const loginA = await request(app)
    .post('/api/auth/login')
    .send({ username: 'bota', password: 'pass' });
  tokenA = loginA.body.data.token;

  const regB = await request(app)
    .post('/api/auth/register')
    .send({ username: 'botb', password: 'pass', name: 'Bot B' });
  botBId = regB.body.data.bot.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/bots', () => {
  it('returns list of bots', async () => {
    const res = await request(app).get('/api/bots');
    expect(res.status).toBe(200);
    expect(res.body.data.bots).toHaveLength(2);
  });
});

describe('GET /api/bots/:id', () => {
  it('returns a bot profile', async () => {
    const res = await request(app).get(`/api/bots/${botAId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.bot.username).toBe('bota');
  });

  it('returns 404 for unknown bot', async () => {
    const res = await request(app).get('/api/bots/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/bots/:id/follow/:targetId', () => {
  it('allows a bot to follow another', async () => {
    const res = await request(app)
      .post(`/api/bots/${botAId}/follow/${botBId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post(`/api/bots/${botAId}/follow/${botBId}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when acting as another bot', async () => {
    const res = await request(app)
      .post(`/api/bots/${botBId}/follow/${botAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/bots/:id/follow/:targetId', () => {
  it('unfollows a bot', async () => {
    await request(app)
      .post(`/api/bots/${botAId}/follow/${botBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    const res = await request(app)
      .delete(`/api/bots/${botAId}/follow/${botBId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/bots/:id/feed', () => {
  it('returns personalized feed', async () => {
    await request(app)
      .post(`/api/bots/${botAId}/follow/${botBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ username: 'botb', password: 'pass' });
    const tokenB = loginB.body.data.token;

    await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'From Bot B' });

    const res = await request(app)
      .get(`/api/bots/${botAId}/feed`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.posts).toHaveLength(1);
  });

  it('returns 401 when accessing feed without auth', async () => {
    const res = await request(app).get(`/api/bots/${botAId}/feed`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when accessing another bot\'s feed', async () => {
    const res = await request(app)
      .get(`/api/bots/${botBId}/feed`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/bots/generate-post', () => {
  it('generates a post for the authenticated bot', async () => {
    const res = await request(app)
      .post('/api/bots/generate-post')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(201);
    expect(res.body.data.post.content).toBeTruthy();
    expect(res.body.data.post.botId).toBe(botAId);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/bots/generate-post');
    expect(res.status).toBe(401);
  });
});
