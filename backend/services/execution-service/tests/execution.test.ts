
import request from 'supertest';
import { app, server } from '../src/index';

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
    expect(res.body.status).toBe('success');
    expect(res.body.results[0].actual_output).toContain('Hello, World!');
  });

  it('should return RUNTIME_ERROR for invalid code', async () => {
    const res = await request(app).post('/').send({
      language: 'javascript',
      code: 'throw new Error("Boom");',
    });

    expect(res.status).toBe(200); 
    expect(res.body.status).toBe('RUNTIME_ERROR');
  });

  it('should return TIME_LIMIT_EXCEEDED for infinite loops', async () => {
    const res = await request(app).post('/').send({
      language: 'javascript',
      code: 'while(true) {}',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('TIME_LIMIT_EXCEEDED');
  }, 10000); 

  it('should reject completely unsupported languages', async () => {
    const res = await request(app).post('/').send({
      language: 'rust', // Not supported
      code: 'fn main() {}',
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Execution service error');
  });
});

