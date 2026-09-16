import request from 'supertest';
import app, { server } from '../src/index';

describe('Execution Service APIs', () => {
  afterAll(() => {
    server.close();
  });

  it('should successfully execute valid code', async () => {
    const res = await request(app).post('/').send({
      language: 'javascript',
      code: 'console.log("Hello, World!");',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.output).toContain('Hello, World!');
  });

  it('should return RUNTIME_ERROR for invalid code', async () => {
    const res = await request(app).post('/').send({
      language: 'javascript',
      code: 'throw new Error("Boom");',
    });

    expect(res.status).toBe(200); // The API itself succeeds, returning the execution result
    expect(res.body.status).toBe('RUNTIME_ERROR');
    expect(res.body.error).toContain('Boom');
  });

  it('should return TIME_LIMIT_EXCEEDED for infinite loops', async () => {
    // Note: We use a tight loop here to test the timeout.
    // In actual JS, an infinite loop blocks the event loop, 
    // but since we run it in a child_process, the parent timeout should still kill it.
    const res = await request(app).post('/').send({
      language: 'javascript',
      code: 'while(true) {}',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('TIME_LIMIT_EXCEEDED');
  }, 10000); // Increase test timeout as the execution timeout is 3000ms

  it('should reject unsupported languages', async () => {
    const res = await request(app).post('/').send({
      language: 'python',
      code: 'print("Hello")',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Unsupported language');
  });
});
