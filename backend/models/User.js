import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['farmer', 'agent'],
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  location: {
    lat: {
      type: Number,
      default: 0
    },
    lng: {
      type: Number,
      default: 0
    },
    address: {
      type: String,
      default: ''
    }
  },
  profilePic: {
    type: String,
    default: ''
  },
  farmSize: {
    type: Number,
    default: 0
  },
  farmDetails: {
    fieldName: { type: String, default: '' },
    village: { type: String, default: '' },
    district: { type: String, default: '' },
    state: { type: String, default: 'Karnataka' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    boundary: { type: Array, default: [] },
    crop: { type: String, default: '' },
    soil: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('User', userSchema);
