import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const secret = process.env.JWT_SECRET || 'krishi-sakha-secret-key-2024';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authenticateFarmer = async (req, res, next) => {
  await authenticate(req, res, () => {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Access denied. Farmers only.' });
    }
    next();
  });
};

export const authenticateAgent = async (req, res, next) => {
  await authenticate(req, res, () => {
    if (req.user.role !== 'agent') {
      return res.status(403).json({ error: 'Access denied. Agents only.' });
    }
    next();
  });
};
