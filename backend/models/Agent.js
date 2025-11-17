import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  services: [{
    type: String,
    enum: ['plowing', 'sowing', 'irrigation', 'spraying', 'harvesting', 'weeding', 'fertilizing', 'pestControl']
  }],
  experience: {
    type: Number,
    default: 0
  },
  hourlyRate: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  availability: {
    type: String,
    enum: ['available', 'busy'],
    default: 'available'
  },
  laborCount: {
    type: Number,
    default: 1
  },
  equipment: [{
    type: String
  }],
  completedJobs: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Agent', agentSchema);
