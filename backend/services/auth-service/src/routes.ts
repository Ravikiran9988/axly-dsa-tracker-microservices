import express from 'express';
import { 
  signup, verifyOtp, login, resendOtp, verifyEmail, 
  resendVerification, forgotPassword, resetPassword, devLogin 
} from './controllers/authController';
import {
  getMyProfile, updateMyProfile, getUserById, listUsers,
  updateUserRole, deleteUser
} from './controllers/userController';
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

// Auth Controller Routes
router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.post('/resend-otp', resendOtp);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/dev-login', devLogin);

const verifySession = async (req: any, res: any) => {
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
};

router.get('/verify', requireAuth, verifySession);
router.post('/verify', requireAuth, verifySession);

// User Controller Routes
router.get('/users/profile/me', requireAuth, getMyProfile);
router.put('/users/profile/me', requireAuth, updateMyProfile);
router.get('/users/:id', requireAuth, getUserById);
router.get('/users', requireAuth, listUsers);
router.put('/users/:id/role', requireAuth, updateUserRole);
router.delete('/users/:id', requireAuth, deleteUser);

export default router;
