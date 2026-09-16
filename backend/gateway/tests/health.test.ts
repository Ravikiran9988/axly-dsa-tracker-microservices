import request from 'supertest';
import app, { server } from '../src/index';

describe('Gateway Health Endpoint', () => {
  afterAll(() => {
    // Close the server after all tests to prevent open handles
    server.close();
  });

  it('should return 200 OK and a timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('timestamp');
  });
});
