import request from 'supertest';
import { app, server } from '../src/index';
import prisma from '../src/db';

jest.mock('../src/db', () => ({
  question: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  topic: {
    findMany: jest.fn()
  },
  questionVersion: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn()
  },
  questionTestCase: {
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
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

describe('Question Service APIs', () => {
  afterAll(async () => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow admin to create a question', async () => {
    (prisma.question.create as jest.Mock).mockResolvedValue({
      id: 'q1',
      title: 'Two Sum',
      slug: 'two-sum',
      description: 'Find two numbers that add up to target',
      difficulty: 'easy',
      version: 1,
      currentVersion: 1
    });

    const res = await request(app)
      .post('/')
      .set('x-user-role', 'admin')
      .send({
        title: 'Two Sum',
        slug: 'two-sum',
        description: 'Find two numbers that add up to target',
        difficulty: 'easy',
        constraints: ['2 <= nums.length <= 10^4'],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Two Sum');
  });

  it('should deny non-admin from creating a question', async () => {
    const res = await request(app)
      .post('/')
      .set('x-user-role', 'user')
      .send({ title: 'Hacked', description: 'hack' });

    expect(res.status).toBe(403);
  });

  it('should list questions', async () => {
    (prisma.question.findMany as jest.Mock).mockResolvedValue([{ id: 'q1', title: 'Two Sum' }]);
    (prisma.question.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.questions)).toBe(true);
    expect(res.body.questions.length).toBe(1);
  });

  it('should fetch topics', async () => {
    (prisma.topic.findMany as jest.Mock).mockResolvedValue([{ id: 't1', name: 'Arrays' }]);
    const res = await request(app).get('/topics');
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Arrays');
  });

  it('should update question and increment version', async () => {
    (prisma.question.findUnique as jest.Mock).mockResolvedValue({
      id: 'q1',
      title: 'Old Title',
      currentVersion: 1
    });
    (prisma.question.update as jest.Mock).mockResolvedValue({
      id: 'q1',
      title: 'New Title',
      currentVersion: 2
    });

    const res = await request(app)
      .put('/q1')
      .set('x-user-role', 'admin')
      .send({ title: 'New Title' });

    expect(res.status).toBe(200);
    expect(res.body.currentVersion).toBe(2);
    expect(prisma.questionVersion.create).toHaveBeenCalled();
  });
});
