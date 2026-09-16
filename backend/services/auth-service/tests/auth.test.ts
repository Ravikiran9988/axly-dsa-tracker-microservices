
import request from 'supertest';
import { app, server } from '../src/index';
import prisma from '../src/db';



describe('Auth Service APIs', () => {
  afterAll(async () => {
    server.close();
  });

  it('should register a new user successfully', async () => {
    const res = await request(app).post('/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Account created successfully. OTP generated.');
    expect(res.body).toHaveProperty('_devOtp');
  });

  it('should reject login for unverified user', async () => {

    const res = await request(app).post('/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(403);
  });
});

