import express from 'express';
import Notification from '../models/Notification.js';
import { authenticate } from '../middleware/auth.js';
import { createNotification } from '../utils/notificationService.js';

const router = express.Router();

// Get all notifications for user
router.get('/all', authenticate, async (req, res) => {
  try {
    const { category, isRead, limit = 50 } = req.query;
    
    const query = { userId: req.userId };
    if (category) query.category = category;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    
    const notifications = await Notification.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit));
    
    const unreadCount = await Notification.countDocuments({
      userId: req.userId,
      isRead: false
    });
    
    res.json({
      notifications,
      unreadCount,
      total: notifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get notification counts by category
router.get('/counts', authenticate, async (req, res) => {
  try {
    const counts = await Notification.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          }
        }
      }
    ]);
    
    const countMap = {};
    counts.forEach(c => {
      countMap[c._id] = { total: c.total, unread: c.unread };
    });
    
    res.json(countMap);
  } catch (error) {
    console.error('Error fetching counts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Marked as read', notification });
  } catch (error) {
    console.error('Error marking notification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { isRead: true }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create notification (for testing)
router.post('/create', authenticate, async (req, res) => {
  try {
    const { type, category, title, message, actionType, actionData } = req.body;
    
    const notification = await createNotification(
      req.userId,
      type,
      category,
      title,
      message,
      actionType,
      actionData
    );
    
    res.status(201).json({
      message: 'Notification created',
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
