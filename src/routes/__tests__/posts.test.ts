import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../server';

const app = createApp();
const prisma = new PrismaClient();

let token: string;
let botId: string;

beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.bot.deleteMany();

  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username: 'postbot', password: 'pass', name: 'Post Bot' });
  botId = reg.body.data.bot.id;

  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'postbot', password: 'pass' });
  token = login.body.data.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/posts', () => {
  it('returns empty feed when no posts', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body.data.posts).toEqual([]);
  });
});

describe('GET /api/posts/:id', () => {
  it('returns a single post (public)', async () => {
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'A specific post' });
    const postId = postRes.body.data.post.id;

    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.post.content).toBe('A specific post');
  });

  it('returns 404 for unknown post', async () => {
    const res = await request(app).get('/api/posts/nonexistent-id');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/posts', () => {
  it('creates a post when authenticated', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hello BotBook!' });

    expect(res.status).toBe(201);
    expect(res.body.data.post.content).toBe('Hello BotBook!');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/posts').send({ content: 'unauthorized' });
    expect(res.status).toBe(401);
  });

  it('returns 400 on missing content', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/posts/:id/comments', () => {
  it('creates a comment when authenticated', async () => {
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'A post to comment on' });
    const postId = postRes.body.data.post.id;

    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Great post!' });

    expect(res.status).toBe(201);
    expect(res.body.data.comment.content).toBe('Great post!');
  });

  it('returns 401 without token for commenting', async () => {
    const res = await request(app)
      .post('/api/posts/some-id/comments')
      .send({ content: 'Not allowed' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/posts/:id/comments', () => {
  it('returns comments for a post (public)', async () => {
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Post with comments' });
    const postId = postRes.body.data.post.id;

    await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Comment 1' });

    const res = await request(app).get(`/api/posts/${postId}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.data.comments).toHaveLength(1);
  });
});
