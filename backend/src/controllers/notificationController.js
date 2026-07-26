import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';

// @route GET /api/notifications?unreadOnly=true
export const listNotifications = asyncHandler(async (req, res) => {
  const filter = { recipient: req.user._id };
  if (req.query.unreadOnly === 'true') filter.read = false;

  const notifications = await Notification.find(filter)
    .sort('-createdAt')
    .limit(100)
    .populate('actor', 'name penColor avatarUrl')
    .populate('document', 'title');

  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, read: false });

  res.json({ success: true, notifications, unreadCount });
});

// @route PATCH /api/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  res.json({ success: true, notification });
});

// @route PATCH /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked read' });
});

// @route DELETE /api/notifications
export const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });
  res.json({ success: true, message: 'All notifications cleared' });
});

// @route DELETE /api/notifications/:id
export const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, recipient: req.user._id });
  res.json({ success: true, message: 'Notification deleted' });
});
