import request from 'supertest';
import app, { server } from '../src/index';
import prisma from '../src/db';
import axios from 'axios';

// Mock axios to avoid calling the real execution service during tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Submission Service APIs', () => {
  beforeAll(async () => {
    await prisma.submission.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
    server.close();
  });

  it('should deny unauthenticated requests', async () => {
    const res = await request(app).post('/').send({
      questionId: 'q1',
      language: 'javascript',
      code: 'console.log("hi")',
    });
    expect(res.status).toBe(401);
  });

  it('should successfully submit and save results', async () => {
    // Mock the execution service response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        status: 'SUCCESS',
        executionTime: 42,
        output: 'hi\n',
      },
    });

    const res = await request(app)
      .post('/')
      .set('x-user-id', 'user123')
      .send({
        questionId: 'q1',
        language: 'javascript',
        code: 'console.log("hi");',
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.userId).toBe('user123');
    expect(res.body.executionTime).toBe(42);
  });

  it('should list submissions for a user', async () => {
    const res = await request(app).get('/').set('x-user-id', 'user123');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].userId).toBe('user123');
  });
});
