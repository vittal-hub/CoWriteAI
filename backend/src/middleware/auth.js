import asyncHandler from 'express-async-handler';
import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authenticated');
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);
    if (!user) {
      res.status(401);
      throw new Error('User no longer exists');
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Invalid or expired token');
  }
});

// Attaches req.user if a valid token is present, but does not require one.
// Used for routes like public share-link previews.
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token = null;
  if (req.cookies?.token) token = req.cookies.token;
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = await User.findById(decoded.sub);
    } catch {
      req.user = null;
    }
  }
  next();
});
