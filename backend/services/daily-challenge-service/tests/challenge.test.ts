import request from 'supertest';
import app, { server } from '../src/index';
import prisma from '../src/db';
import axios from 'axios';
import { generateAndPublishDailyChallenge } from '../src/scheduler';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Daily Challenge Service', () => {
  beforeAll(async () => {
    await prisma.dailyChallenge.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
    server.close();
  });

  it('should successfully trigger a new daily challenge and save to DB', async () => {
    // Mock AI Service returning a generated question
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        title: "Mocked Array Question",
        difficulty: "MEDIUM",
        examples: [],
        constraints: [],
        starterCode: {}
      }
    });

    // Mock Question Service returning the saved canonical question ID
    mockedAxios.post.mockResolvedValueOnce({
      data: { id: "canonical-q-123" }
    });

    const res = await request(app).post('/trigger');

    expect(res.status).toBe(200);
    expect(res.body.questionId).toBe("canonical-q-123");
    expect(res.body.status).toBe("PUBLISHED");
  });

  it('should be idempotent and not trigger if one exists for today', async () => {
    // It should skip calling Axios and just return the existing record
    const res = await request(app).post('/trigger');
    expect(res.status).toBe(200);
    expect(res.body.questionId).toBe("canonical-q-123"); // The same one we just created
    
    // Ensure axios was NOT called again (it was only called twice in the previous test)
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('should fetch todays challenge', async () => {
    const res = await request(app).get('/today');
    expect(res.status).toBe(200);
    expect(res.body.questionId).toBe("canonical-q-123");
  });
});
