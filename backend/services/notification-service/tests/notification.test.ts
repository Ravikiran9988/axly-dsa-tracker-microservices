import request from 'supertest';
import { app } from '../src/index';
import prisma from '../src/db';

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

jest.mock('../src/db', () => ({
  __esModule: true,
  default: {
    practiceUserProgress: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([])
    },
    pointsLedger: {
      deleteMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([])
    },
    userStats: {
      deleteMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({})
    },
    $disconnect: jest.fn()
  }
}));

jest.mock('shared', () => {
  const original = jest.requireActual('shared');
  return {
    ...original,
    RabbitMQClient: {
      getInstance: jest.fn().mockReturnValue({
        connect: jest.fn(),
        consume: jest.fn()
      })
    }
  };
});

describe('Progress Service', () => {
  beforeAll(async () => {
    // Tests are using mocks
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

  it('should return mine analytics', async () => {
    const res = await request(app).get('/analytics/mine').set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.data.summary.total_submissions).toBe(0);
  });
});
