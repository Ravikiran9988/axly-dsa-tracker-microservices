
import request from 'supertest';
import { app, server } from '../src/index';
import prisma from '../src/db';
import axios from 'axios';






describe('Submission Service APIs', () => {
  afterAll(async () => {
    server.close();
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
        passedTests: 10,
        totalTests: 10
      },
    });

    mockedAxios.get.mockResolvedValueOnce({
      data: [{ id: 'tc1', input: '', expected_output: '', is_hidden: false }]
    });

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
    const res = await request(app).get('/submissions/q1').set('x-user-id', 'user123');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

