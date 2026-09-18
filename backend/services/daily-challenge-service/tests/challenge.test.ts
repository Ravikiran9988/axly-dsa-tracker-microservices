import request from 'supertest';
import { app, server } from '../src/index';
import prisma from '../src/db';
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../src/db', () => ({
  dailyQuestion: {
    findUnique: jest.fn()
  }
}));

describe('Daily Challenge Service', () => {
  afterAll(async () => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully trigger a new daily challenge and save to DB', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        data: {
          title: "Test Problem",
          slug: "test-problem",
          description: "Test Desc",
          difficulty: "MEDIUM",
          constraints: [],
          starterCode: {}
        }
      }
    }); // AI generation mock
    
    mockedAxios.post.mockResolvedValueOnce({
      data: { id: "canonical-q-123" }
    }); // Question service mock

    const res = await request(app).post('/trigger').set('x-user-role', 'admin');

    expect(res.status).toBe(202);
    expect(res.body.questionId).toBe("canonical-q-123");
  });

  it('should fetch todays challenge', async () => {
    (prisma.dailyQuestion.findUnique as jest.Mock).mockResolvedValue({
      id: 'dc1',
      date: new Date(),
      questionId: 'canonical-q-123',
      createdBy: 'user1'
    });

    const res = await request(app).get('/today');
    expect(res.status).toBe(200);
    expect(res.body.questionId).toBe("canonical-q-123");
  });
});
