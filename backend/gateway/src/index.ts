import { correlationIdMiddleware, errorHandlerMiddleware } from 'shared';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateJWT } from './middleware/jwt';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Strip internal headers to prevent forging
app.use((req, res, next) => {
  delete req.headers['x-user-id'];
  delete req.headers['x-user-role'];
  next();
});

app.use(correlationIdMiddleware);

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

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:5002';
const SUBMISSION_SERVICE_URL = process.env.SUBMISSION_SERVICE_URL || 'http://localhost:5003';
const EXECUTION_SERVICE_URL = process.env.EXECUTION_SERVICE_URL || 'http://localhost:5004';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5005';
const CHALLENGE_SERVICE_URL = process.env.CHALLENGE_SERVICE_URL || 'http://localhost:5006';
const PROGRESS_SERVICE_URL = process.env.PROGRESS_SERVICE_URL || 'http://localhost:5007';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5008';
const COHORT_SERVICE_URL = process.env.COHORT_SERVICE_URL || 'http://localhost:5009';

const authMiddleware = [authenticateJWT, (req: any, res: any, next: any) => {
  if (req.user) {
    req.headers['x-user-id'] = req.user.id;
    req.headers['x-user-role'] = req.user.role;
  }
  next();
}];

// Auth & Users (Auth Service)
app.use('/api/auth', createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true }));
app.use('/api/users', authMiddleware, createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true }));
app.use('/api/audit', authMiddleware, createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true }));

// Questions & Content (Question Service)
app.use('/api/questions', createProxyMiddleware({ target: QUESTION_SERVICE_URL, changeOrigin: true }));
app.use('/api/practice', createProxyMiddleware({ target: QUESTION_SERVICE_URL, changeOrigin: true }));
app.use('/api/assignments', authMiddleware, createProxyMiddleware({ target: QUESTION_SERVICE_URL, changeOrigin: true }));

// Submissions (Submission Service)
app.use('/api/submissions', authMiddleware, createProxyMiddleware({ target: SUBMISSION_SERVICE_URL, changeOrigin: true }));
app.use('/api/code', authMiddleware, createProxyMiddleware({ target: SUBMISSION_SERVICE_URL, changeOrigin: true }));

// Execution (Execution Service)
app.use('/api/execution', authMiddleware, createProxyMiddleware({ target: EXECUTION_SERVICE_URL, changeOrigin: true }));

// AI (AI Service)
app.use('/api/ai', authMiddleware, createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));
app.use('/api/ai-questions', authMiddleware, createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));
app.use('/api/dsa-ai', authMiddleware, createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));
app.use('/api/recommendations', authMiddleware, createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));

// Daily Challenges (Challenge Service)
app.use('/api/daily-challenges', createProxyMiddleware({ target: CHALLENGE_SERVICE_URL, changeOrigin: true }));
app.use('/api/challenges', createProxyMiddleware({ target: CHALLENGE_SERVICE_URL, changeOrigin: true }));

// Progress, Analytics (Progress Service)
app.use('/api/progress', authMiddleware, createProxyMiddleware({ target: PROGRESS_SERVICE_URL, changeOrigin: true }));
app.use('/api/analytics', authMiddleware, createProxyMiddleware({ target: PROGRESS_SERVICE_URL, changeOrigin: true }));

// Notifications (Notification Service)
app.use('/api/notifications', authMiddleware, createProxyMiddleware({ target: NOTIFICATION_SERVICE_URL, changeOrigin: true }));

// Cohorts (Cohort Service)
app.use('/api/cohorts', authMiddleware, createProxyMiddleware({ target: COHORT_SERVICE_URL, changeOrigin: true }));

app.use(errorHandlerMiddleware);

let server: any = { close: () => {} };
const start = () => {
  server = app.listen(PORT, () => {
    console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
  });
};

const shutdown = async () => {
  console.log('Shutting down gateway...');
  if (server) server.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app, server };
export default app;
