import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  listNotifications,
  markRead,
  markAllRead,
  clearAllNotifications,
  deleteNotification,
} from '../controllers/notificationController.js';

const router = Router();

router.use(protect);
router.get('/', listNotifications);
router.delete('/', clearAllNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
