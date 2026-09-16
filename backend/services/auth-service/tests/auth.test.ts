jest.mock('shared', () => ({ RabbitMQClient: { getInstance: jest.fn().mockReturnValue({ publish: jest.fn(), consume: jest.fn() }) } }));
import request from 'supertest';
import { app, server } from '../src/index';
import prisma from '../src/db';

jest.mock('../src/db', () => ({
  __esModule: true,
  default: {
    user: {
      deleteMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: '123', email: 'test@example.com' }),
    },
    $disconnect: jest.fn(),
  }
}));

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
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ 
      id: '123', 
      email: 'test@example.com', 
      isVerified: false, 
      passwordHash: 'hash' 
    });
    
    const res = await request(app).post('/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(403);
  });
});
