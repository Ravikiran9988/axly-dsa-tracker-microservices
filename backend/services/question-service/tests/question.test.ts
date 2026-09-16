import request from 'supertest';
import app, { server } from '../src/index';
import prisma from '../src/db';

describe('Question Service APIs', () => {
  beforeAll(async () => {
    await prisma.question.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
    server.close();
  });

  it('should allow admin to create a question', async () => {
    const res = await request(app)
      .post('/')
      .set('x-user-role', 'ADMIN')
      .send({
        title: 'Two Sum',
        description: 'Find two numbers that add up to target',
        difficulty: 'EASY',
        examples: [{ input: '[2,7,11,15], target=9', output: '[0,1]' }],
        constraints: ['2 <= nums.length <= 10^4'],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Two Sum');
  });

  it('should deny non-admin from creating a question', async () => {
    const res = await request(app)
      .post('/')
      .set('x-user-role', 'USER')
      .send({ title: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('should list questions', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
