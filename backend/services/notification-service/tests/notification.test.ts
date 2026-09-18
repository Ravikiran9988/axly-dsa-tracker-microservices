import request from 'supertest';
import { app } from '../src/index';

jest.mock('../src/redis', () => ({
  connectRedis: jest.fn()
}));
jest.mock('shared', () => {
  const original = jest.requireActual('shared');
  return {
    ...original,
    RabbitMQClient: {
      getInstance: jest.fn().mockReturnValue({
        connect: jest.fn(),
        consume: jest.fn(),
        close: jest.fn()
      })
    }
  };
});

describe('Notification Service', () => {
  afterAll(async () => {
  });

  it('should return health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
