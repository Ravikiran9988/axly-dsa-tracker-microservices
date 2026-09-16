jest.mock('shared', () => ({ RabbitMQClient: { getInstance: jest.fn().mockReturnValue({ publish: jest.fn(), consume: jest.fn() }) } }));
import request from 'supertest';
import { app } from '../src/index';
import prisma from '../src/db';
import redisClient from '../src/redis';

// Mock Prisma
jest.mock('../src/db', () => ({
  __esModule: true,
  default: {
    practiceUserProgress: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn()
    },
    pointsLedger: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn()
    },
    userStats: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn()
    },
    $disconnect: jest.fn()
  }
}));

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

jest.mock('shared', () => ({
  RabbitMQClient: {
    getInstance: jest.fn().mockReturnValue({
      connect: jest.fn(),
      consume: jest.fn(),
      publish: jest.fn(),
      close: jest.fn()
    })
  }
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
