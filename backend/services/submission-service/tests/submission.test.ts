import request from 'supertest';
import { app, server } from '../src/index';
import prisma from '../src/db';
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../src/db', () => ({
  codeSubmissionLog: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  submission: {
    upsert: jest.fn()
  }
}));

jest.mock('shared', () => {
  const originalModule = jest.requireActual('shared');
  return {
    ...originalModule,
    RabbitMQClient: {
      getInstance: jest.fn().mockReturnValue({
        publish: jest.fn().mockResolvedValue(true)
      })
    }
  };
});

describe('Submission Service APIs', () => {
  afterAll(async () => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should deny unauthenticated requests to submit', async () => {
    const res = await request(app).post('/submit').send({
      question_id: 'q1',
      language: 'javascript',
      source_code: 'console.log("hi")',
    });
    expect(res.status).toBe(401);
  });

  it('should successfully submit and save results', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        status: 'success',
        executionTime: 42,
        passedTests: 1,
        totalTests: 1
      },
    });

    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: 'tc1', input: '', expected_output: '', is_hidden: false }]
    });

    (prisma.codeSubmissionLog.create as jest.Mock).mockResolvedValue({ id: 'log1' });
    (prisma.submission.upsert as jest.Mock).mockResolvedValue({ id: 'sub1', status: 'solved', userId: 'user123', questionId: 'q1' });

    const res = await request(app)
      .post('/submit')
      .set('x-user-id', 'user123')
      .send({
        question_id: 'q1',
        language: 'javascript',
        source_code: 'console.log("hi");',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.submission_status).toBe('solved');
  });

  it('should list submissions history for a user', async () => {
    (prisma.codeSubmissionLog.findMany as jest.Mock).mockResolvedValue([{
      id: 'log1', questionId: 'q1', language: 'javascript', code: 'hi', status: 'success', passedTests: 1, totalTests: 1, executionTimeMs: 10, createdAt: new Date()
    }]);

    const res = await request(app).get('/submissions/q1').set('x-user-id', 'user123');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });
});
