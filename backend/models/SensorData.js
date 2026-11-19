import mongoose from 'mongoose';

const sensorDataSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  temperature: {
    type: Number,
    default: null,
    required: false
  },
  humidity: {
    type: Number,
    default: null,
    required: false
  },
  soilMoisture: {
    type: Number,
    default: null,
    required: false
  },
  pH: {
    type: Number,
    default: null,
    required: false
  },
  rainfall: {
    type: Number,
    default: 0
  },
  rainLevel: {
    type: Number,
    default: 0
  },
  nitrogen: {
    type: Number,
    default: 0
  },
  phosphorus: {
    type: Number,
    default: 0
  },
  potassium: {
    type: Number,
    default: 0
  },
  soilRaw: {
    type: Number,
    default: null
  },
  rssi: {
    type: Number,
    default: null
  },
  packetNum: {
    type: Number,
    default: null
  },
  deviceId: {
    type: String,
    default: 'ESP32_SENSOR_001'
  },
  source: {
    type: String,
    default: 'krishi-sakha'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
sensorDataSchema.index({ farmerId: 1, timestamp: -1 });

export default mongoose.model('SensorData', sensorDataSchema);
