jest.mock('shared', () => ({ RabbitMQClient: { getInstance: jest.fn().mockReturnValue({ publish: jest.fn(), consume: jest.fn() }) } }));
import request from 'supertest';
import { app, server } from '../src/index';
import prisma from '../src/db';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../src/db', () => ({
  __esModule: true,
  default: {
    dailyQuestion: {
      deleteMany: jest.fn(),
      findFirst: jest.fn()
        .mockResolvedValueOnce(null) // first time null (not triggered yet)
        .mockResolvedValueOnce({ id: '1', questionId: "canonical-q-123", scheduledDate: new Date() }) // second time exists
        .mockResolvedValue({ id: '1', questionId: "canonical-q-123", scheduledDate: new Date() }), // third time for /today
      create: jest.fn().mockResolvedValue({ id: '1', questionId: "canonical-q-123", scheduledDate: new Date() }),
    },
    dailyChallengeProblem: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    dailyChallengeTestCase: {
      createMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  }
}));

describe('Daily Challenge Service', () => {
  afterAll(async () => {
    server.close();
  });

  it('should successfully trigger a new daily challenge and save to DB', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        title: "Test Problem",
        slug: "test-problem",
        description: "Test Desc",
        difficulty: "MEDIUM",
        constraints: [],
        starterCode: {}
      }
    }); // AI generation mock
    
    mockedAxios.post.mockResolvedValueOnce({
      data: { id: "canonical-q-123" }
    }); // Question service mock

    const res = await request(app).post('/trigger');

    expect(res.status).toBe(200);
    expect(res.body.questionId).toBe("canonical-q-123");
  });

  it('should be idempotent and not trigger if one exists for today', async () => {
    const res = await request(app).post('/trigger');
    expect(res.status).toBe(200);
    expect(res.body.questionId).toBe("canonical-q-123");
    
    expect(mockedAxios.post).toHaveBeenCalledTimes(2); // Only from the first test
  });

  it('should fetch todays challenge', async () => {
    const res = await request(app).get('/today');
    expect(res.status).toBe(200);
    expect(res.body.questionId).toBe("canonical-q-123");
  });
});
