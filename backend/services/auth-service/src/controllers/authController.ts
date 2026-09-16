import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../db';
import crypto from 'crypto';
import { RabbitMQClient } from 'shared';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateNumericOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isTokenExpired(expiresAt: Date | null) {
  if (!expiresAt) return true;
  return expiresAt.getTime() <= Date.now();
}

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: { message: 'Name, email and password are required' } });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser && existingUser.passwordHash && existingUser.emailVerified) {
      return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'An account with this email address already exists.' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create role if doesn't exist
    await prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: { name: 'user' }
    });

    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash, name: name.trim() }
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          emailVerified: false,
          roleId: 'user'
        }
      });
    }

    const otp = generateNumericOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate old tokens
    await prisma.authToken.deleteMany({
      where: { userId: user.id, tokenType: { in: ['otp_verification', 'verification'] } }
    });

    await prisma.authToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(otp),
        tokenType: 'otp_verification',
        expiresAt
      }
    });

    // TODO: Send Email via event bus or direct mailer
    
    res.status(201).json({ message: 'Account created successfully. OTP generated.', email: user.email, _devOtp: otp });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    
    if (!normalizedEmail || !otp) {
      return res.status(400).json({ error: { message: 'Email and OTP required' } });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(400).json({ error: { message: 'Invalid verification code' } });

    const token = await prisma.authToken.findFirst({
      where: {
        userId: user.id,
        tokenType: 'otp_verification',
        tokenHash: hashToken(otp),
        usedAt: null
      }
    });

    if (!token || isTokenExpired(token.expiresAt)) {
      return res.status(400).json({ error: { message: 'Invalid or expired OTP' } });
    }

    // Mark used and verify
    await prisma.$transaction([
      prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } })
    ]);

    const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.roleId }, JWT_SECRET, { expiresIn: '1d' });

    await RabbitMQClient.getInstance().publish('events', 'user.registered', {
      userId: user.id,
      email: user.email,
      name: user.name,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      message: 'Account verified successfully',
      token: jwtToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.roleId }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: { message: 'Email and password required' } });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: { code: 'UNVERIFIED_EMAIL', message: 'Please verify your email.' } });
    }

    const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.roleId }, JWT_SECRET, { expiresIn: '1d' });

    // Record login
    const today = new Date();
    today.setHours(0,0,0,0);
    await prisma.userDailyActivity.upsert({
      where: { userId_activityDate: { userId: user.id, activityDate: today } },
      update: {},
      create: { userId: user.id, activityDate: today, activityType: 'login' }
    }).catch(() => {}); // ignore duplicate conflict

    res.status(200).json({
      token: jwtToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.roleId }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    
    if (!normalizedEmail) {
      return res.status(400).json({ error: { message: 'A valid email address is required' } });
    }
    
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user && !user.emailVerified) {
      await prisma.authToken.deleteMany({
        where: { userId: user.id, tokenType: 'otp_verification' }
      });
      
      const newOtp = generateNumericOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      await prisma.authToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(newOtp),
          tokenType: 'otp_verification',
          expiresAt
        }
      });
      
      // TODO: Send resend OTP email
    }
    return res.status(200).json({ message: 'If an unverified account exists for this email, a new verification code has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token, email, otp } = req.body;
    if (email && otp) return verifyOtp(req, res);
    
    if (!token) return res.status(400).json({ error: { message: 'Verification token is required' } });
    
    const tokenHash = hashToken(token.trim());
    let authToken = await prisma.authToken.findFirst({
      where: { tokenHash, tokenType: 'verification', usedAt: null }
    });
    
    if (!authToken) {
      authToken = await prisma.authToken.findFirst({
        where: { tokenHash, tokenType: 'otp_verification', usedAt: null }
      });
    }
    
    if (!authToken) return res.status(400).json({ error: { message: 'The verification link is invalid or has already been used.' } });
    if (isTokenExpired(authToken.expiresAt)) return res.status(400).json({ error: { message: 'The verification link has expired. Please request a new one.' } });

    await prisma.$transaction([
      prisma.authToken.update({ where: { id: authToken.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: authToken.userId }, data: { emailVerified: true } })
    ]);
    
    const user = await prisma.user.findUnique({ where: { id: authToken.userId } });
    const jwtToken = jwt.sign({ id: user!.id, email: user!.email, role: user!.roleId }, JWT_SECRET, { expiresIn: '1d' });
    
    await RabbitMQClient.getInstance().publish('events', 'user.registered', {
      userId: user!.id, email: user!.email, name: user!.name, timestamp: new Date().toISOString()
    });

    res.status(200).json({
      message: 'Your email address has been verified successfully.',
      token: jwtToken,
      user: { id: user!.id, name: user!.name, email: user!.email, role: user!.roleId }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resendVerification = resendOtp;

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    
    if (!normalizedEmail) return res.status(400).json({ error: { message: 'A valid email address is required' } });
    
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      await prisma.authToken.deleteMany({
        where: { userId: user.id, tokenType: 'password_reset' }
      });
      
      await prisma.authToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          tokenType: 'password_reset',
          expiresAt
        }
      });
      // TODO: Send password reset email
    }
    return res.status(200).json({ message: 'If an account exists for this email, a password reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: { message: 'Token and password are required' } });
    if (password.length < 8) return res.status(400).json({ error: { message: 'Password is too weak' } });

    const authToken = await prisma.authToken.findFirst({
      where: { tokenHash: hashToken(token.trim()), tokenType: 'password_reset', usedAt: null }
    });
    
    if (!authToken) return res.status(400).json({ error: { message: 'The password reset link is invalid or has already been used.' } });
    if (isTokenExpired(authToken.expiresAt)) return res.status(400).json({ error: { message: 'The password reset link has expired.' } });

    const passwordHash = await bcrypt.hash(password, 10);
    
    await prisma.$transaction([
      prisma.user.update({ where: { id: authToken.userId }, data: { passwordHash } }),
      prisma.authToken.update({ where: { id: authToken.id }, data: { usedAt: new Date() } })
    ]);

    return res.status(200).json({ message: 'Password has been reset successfully. You can now sign in with your new password.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const devLogin = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: { message: 'Development login is disabled in production.' } });
    const { email, role = 'user' } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    
    if (!normalizedEmail) return res.status(400).json({ error: { message: 'Email required' } });
    
    await prisma.role.upsert({ where: { name: role }, update: {}, create: { name: role } });
    
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          emailVerified: true,
          roleId: role,
        }
      });
    } else if (role !== user.roleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { roleId: role }
      });
    }
    
    const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.roleId }, JWT_SECRET, { expiresIn: '1d' });
    
    return res.status(200).json({ token: jwtToken, user: { id: user.id, name: user.name, email: user.email, role: user.roleId } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
