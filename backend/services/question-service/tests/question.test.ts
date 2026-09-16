
import request from 'supertest';
import { app, server } from '../src/index';
import prisma from '../src/db';



describe('Question Service APIs', () => {
  afterAll(async () => {
    server.close();
  });

  it('should allow admin to create a question', async () => {
    const res = await request(app)
      .post('/')
      .set('x-user-role', 'admin')
      .send({
        title: 'Two Sum',
        slug: 'two-sum',
        description: 'Find two numbers that add up to target',
        difficulty: 'easy',
        constraints: ['2 <= nums.length <= 10^4'],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Two Sum');
  });

  it('should deny non-admin from creating a question', async () => {
    const res = await request(app)
      .post('/')
      .set('x-user-role', 'user')
      .send({ title: 'Hacked', description: 'hack' });

    expect(res.status).toBe(403);
  });

  it('should list questions', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

