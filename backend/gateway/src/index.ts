import { correlationIdMiddleware, errorHandlerMiddleware } from 'shared';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

app.use((req, res, next) => {
  if (!req.headers['x-correlation-id']) {
    req.headers['x-correlation-id'] = crypto.randomUUID();
  }
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, 
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });

});

app.get('/readiness', (req, res) => {
  res.json({ status: 'ready' });
});

app.use(errorHandlerMiddleware);

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:5002';
const SUBMISSION_SERVICE_URL = process.env.SUBMISSION_SERVICE_URL || 'http://localhost:5003';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5005';
const CHALLENGE_SERVICE_URL = process.env.CHALLENGE_SERVICE_URL || 'http://localhost:5006';
const PROGRESS_SERVICE_URL = process.env.PROGRESS_SERVICE_URL || 'http://localhost:5007';

import { authenticateJWT } from './middleware/jwt';

const authMiddleware = [authenticateJWT, (req: any, res: any, next: any) => {
  req.headers['x-user-id'] = req.user.id;
  req.headers['x-user-role'] = req.user.role;
  next();
}];

// Auth
app.use('/api/auth', createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true }));
app.use('/api/users', authMiddleware, createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true }));

// Questions
app.use('/api/questions', createProxyMiddleware({ target: QUESTION_SERVICE_URL, changeOrigin: true }));

// Submissions & Execution
app.use('/api/submissions', authMiddleware, createProxyMiddleware({ target: SUBMISSION_SERVICE_URL, changeOrigin: true }));
app.use('/api/code', authMiddleware, createProxyMiddleware({ target: SUBMISSION_SERVICE_URL, changeOrigin: true }));

// AI
app.use('/api/ai', authMiddleware, createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));
app.use('/api/ai-questions', authMiddleware, createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));
app.use('/api/dsa-ai', authMiddleware, createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));

// Daily Challenges
app.use('/api/daily-challenges', createProxyMiddleware({ target: CHALLENGE_SERVICE_URL, changeOrigin: true }));
app.use('/api/challenges', createProxyMiddleware({ target: CHALLENGE_SERVICE_URL, changeOrigin: true }));

// Progress & Analytics
app.use('/api/progress', authMiddleware, createProxyMiddleware({ target: PROGRESS_SERVICE_URL, changeOrigin: true }));
app.use('/api/analytics', authMiddleware, createProxyMiddleware({ target: PROGRESS_SERVICE_URL, changeOrigin: true }));

let server: any;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
  });
}
export { server };
export default app;
