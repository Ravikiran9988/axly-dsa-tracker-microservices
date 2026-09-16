import { Request, Response } from 'express';
import prisma from '../db';

export const getMyProfile = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, roleId: true, avatarUrl: true, institution: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMyProfile = async (req: any, res: Response) => {
  try {
    const { name, avatarUrl, institution } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, avatarUrl, institution },
      select: { id: true, name: true, email: true, roleId: true, avatarUrl: true, institution: true, createdAt: true }
    });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, roleId: true, avatarUrl: true, institution: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listUsers = async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: Number(limit),
        select: { id: true, name: true, email: true, roleId: true, emailVerified: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count()
    ]);
    
    res.status(200).json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUserRole = async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const { role } = req.body;
    
    if (!role) return res.status(400).json({ error: 'Role is required' });
    
    await prisma.role.upsert({ where: { name: role }, update: {}, create: { name: role } });
    
    const user = await prisma.user.update({
      where: { id },
      data: { roleId: role },
      select: { id: true, name: true, email: true, roleId: true }
    });
    
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    
    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
