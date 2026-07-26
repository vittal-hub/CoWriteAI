import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
  deleteMe,
  verifyEmail,
  resendVerification,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// The generic /api rate limiter (500 req/15min) is far too loose to stop
// credential-stuffing or password-brute-force against a single account —
// this limits register/login specifically, keyed per-IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

// Resend-verification is a lighter-weight, easy-to-hit endpoint (no password
// required) — a tighter limiter keeps it from being usable as an email bomb
// against a target address.
const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendLimiter, resendVerification);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.delete('/me', protect, deleteMe);

export default router;
