import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 4000;

// Security and utility middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json()); // Only needed for endpoints directly handled by gateway, not proxy

// Inject Correlation ID
app.use((req, res, next) => {
  if (!req.headers['x-correlation-id']) {
    req.headers['x-correlation-id'] = crypto.randomUUID();
  }
  next();
});

// Rate limiting foundation
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Proxy routes (Environment-based service URLs)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:5002';
const SUBMISSION_SERVICE_URL = process.env.SUBMISSION_SERVICE_URL || 'http://localhost:5003';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5005';
const CHALLENGE_SERVICE_URL = process.env.CHALLENGE_SERVICE_URL || 'http://localhost:5006';

import { authenticateJWT } from './middleware/jwt';

// Public route for authentication
app.use('/api/auth', createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true }));

// Questions can be read publicly, but creation is admin-only (handled by Question Service)
app.use('/api/questions', createProxyMiddleware({ target: QUESTION_SERVICE_URL, changeOrigin: true }));

// Submissions require authentication
app.use('/api/submissions', authenticateJWT, (req, res, next) => {
  // Pass the user id to the downstream service via headers
  req.headers['x-user-id'] = (req as any).user.id;
  req.headers['x-user-role'] = (req as any).user.role;
  next();
}, createProxyMiddleware({ target: SUBMISSION_SERVICE_URL, changeOrigin: true }));

// AI Service requires authentication
app.use('/api/ai', authenticateJWT, createProxyMiddleware({ target: AI_SERVICE_URL, changeOrigin: true }));

// Daily Challenges
app.use('/api/challenges', createProxyMiddleware({ target: CHALLENGE_SERVICE_URL, changeOrigin: true }));

// Progress Service
const PROGRESS_SERVICE_URL = process.env.PROGRESS_SERVICE_URL || 'http://localhost:5007';
app.use('/api/progress', authenticateJWT, createProxyMiddleware({ target: PROGRESS_SERVICE_URL, changeOrigin: true }));

export const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
});

export default app;
