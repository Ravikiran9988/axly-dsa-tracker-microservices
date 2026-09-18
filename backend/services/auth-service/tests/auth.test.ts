import request from 'supertest';
import { app, server } from '../src/index';
import prisma from '../src/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

jest.mock('../src/db', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  role: {
    upsert: jest.fn(),
  },
  authToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  userDailyActivity: {
    upsert: jest.fn(),
  },
  $transaction: jest.fn((promises) => Promise.all(promises)),
}));

// Mock RabbitMQClient
jest.mock('shared', () => {
  const originalModule = jest.requireActual('shared');
  return {
    ...originalModule,
    RabbitMQClient: {
      getInstance: jest.fn().mockReturnValue({
        publish: jest.fn().mockResolvedValue(true),
        consume: jest.fn(),
      })
    }
  };
});

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

describe('Auth Service APIs', () => {
  afterAll(async () => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully and assign default role', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.role.upsert as jest.Mock).mockResolvedValue({ name: 'user' });
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'uuid-123',
      name: 'Test User',
      email: 'test@example.com',
      roleId: 'user',
    });
    (prisma.authToken.create as jest.Mock).mockResolvedValue({ tokenHash: 'hashedotp' });

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
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-123',
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: false,
      roleId: 'user',
    });

    const res = await request(app).post('/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(403);
  });

  it('should verify OTP and return a JWT containing id and role', async () => {
    (prisma.authToken.findFirst as jest.Mock).mockResolvedValue({
      userId: 'uuid-123',
      tokenType: 'otp_verification',
      expiresAt: new Date(Date.now() + 10000),
      usedAt: null,
      id: 'token-123',
    });
    (prisma.authToken.update as jest.Mock).mockResolvedValue(true);
    (prisma.user.update as jest.Mock).mockResolvedValue(true);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-123',
      name: 'Test User',
      email: 'test@example.com',
      roleId: 'user'
    });

    const res = await request(app).post('/verify-otp').send({
      email: 'test@example.com',
      otp: '123456',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('role', 'user');

    const decoded = jwt.verify(res.body.token, JWT_SECRET) as any;
    expect(decoded).toHaveProperty('id', 'uuid-123');
    expect(decoded).toHaveProperty('role', 'user');
  });

  it('should login verified user successfully', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-123',
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      roleId: 'user',
    });
    (prisma.userDailyActivity.upsert as jest.Mock).mockResolvedValue(true);

    const res = await request(app).post('/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('role', 'user');
  });

  it('should allow POST /verify with valid JWT', async () => {
    const validToken = jwt.sign({ id: 'uuid-123', email: 'test@example.com', role: 'user' }, JWT_SECRET);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-123',
      email: 'test@example.com',
      roleId: 'user',
    });

    const res = await request(app)
      .post('/verify')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('email', 'test@example.com');
  });
});
