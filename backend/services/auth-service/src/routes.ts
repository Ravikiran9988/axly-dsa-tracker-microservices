import express from 'express';
import { signup, verifyOtp, login } from './controllers/authController';
import jwt from 'jsonwebtoken';
import prisma from './db';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

// Auth middleware for protected routes
export const requireAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);

router.get('/verify', requireAuth, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, roleId: true, avatarUrl: true, institution: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
