import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['critical', 'alert', 'warning', 'success', 'info'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['sensor', 'weather', 'price', 'labour', 'disease', 'scheme', 'crop', 'harvest'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    default: 0
  },
  isRead: {
    type: Boolean,
    default: false
  },
  actionType: {
    type: String,
    enum: ['find_labour', 'check_price', 'view_details', 'book_service', 'apply_scheme', 'none'],
    default: 'none'
  },
  actionData: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // Auto-delete after 30 days
  }
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);
