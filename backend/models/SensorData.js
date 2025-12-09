import mongoose from 'mongoose';

const sensorDataSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  soilMoisture: {
    type: Number,
    required: true
  },
  pH: {
    type: Number,
    required: true
  },
  rainfall: {
    type: Number,
    default: 0
  },
  rainLevel: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
sensorDataSchema.index({ farmerId: 1, timestamp: -1 });

export default mongoose.model('SensorData', sensorDataSchema);
