import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Basic JWT middleware foundation
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: Malformed token' });
    }
    
    // Defaulting to a dummy secret for the foundation
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_here';

    jwt.verify(token, secret, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Forbidden: Invalid token' });
      }
      
      // Store user info in request for downstream services if needed
      (req as any).user = user;
      next();
    });
  } else {
    res.status(401).json({ message: 'Unauthorized: Missing token' });
  }
};
