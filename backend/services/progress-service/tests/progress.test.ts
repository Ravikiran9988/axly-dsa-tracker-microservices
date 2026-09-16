
import request from 'supertest';
import { app } from '../src/index';
import prisma from '../src/db';
import redisClient from '../src/redis';

// Mock Prisma


// Mock Redis and RabbitMQ to avoid real connections in unit tests
jest.mock('../src/redis', () => ({
  __esModule: true,
  default: {
    zRangeWithScores: jest.fn(),
    zAdd: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  },
  connectRedis: jest.fn()
}));



describe('Progress Service', () => {
  beforeAll(async () => {
    await prisma.practiceUserProgress.deleteMany({});
    await prisma.pointsLedger.deleteMany({});
    await prisma.userStats.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return leaderboard', async () => {
    const mockRedis = require('../src/redis').default;
    mockRedis.zRangeWithScores.mockResolvedValueOnce([
      { value: 'user1', score: 100 },
      { value: 'user2', score: 50 }
    ]);

    const res = await request(app).get('/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].value).toBe('user1');
  });
});

