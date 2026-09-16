import request from 'supertest';
import app, { server } from '../src/index';
import prisma from '../src/db';

describe('Auth Service APIs', () => {
  beforeAll(async () => {
    // Wait for the DB or clear existing users if necessary
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
    server.close();
  });

  it('should register a new user successfully', async () => {
    const res = await request(app).post('/register').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'User created successfully');
    expect(res.body).toHaveProperty('userId');
  });

  it('should login the user and return a token', async () => {
    const res = await request(app).post('/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('role', 'USER');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app).post('/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });
});
