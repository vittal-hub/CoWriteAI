import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.js';
import { rewriteText, autocorrectText } from '../controllers/aiController.js';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests, please slow down.' },
});

router.use(protect, aiLimiter);
router.post('/rewrite', rewriteText);
router.post('/autocorrect', autocorrectText);

export default router;
