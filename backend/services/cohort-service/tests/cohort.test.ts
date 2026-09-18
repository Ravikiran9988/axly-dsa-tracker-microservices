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

describe('Cohort Service', () => {
  afterAll(async () => {
  });

  it('should return 410 for cohorts API', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(410);
  });
});
