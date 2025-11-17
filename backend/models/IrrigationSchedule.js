import mongoose from 'mongoose';

const irrigationScheduleSchema = new mongoose.Schema({
  fieldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Field',
    required: true
  },
  
  // Analysis inputs
  analysisDate: {
    type: Date,
    default: Date.now
  },
  
  // Zone-wise water requirements
  zones: [{
    zoneName: String,
    zoneId: String,
    waterStressLevel: {
      type: String,
      enum: ['critical', 'moderate', 'low', 'optimal']
    },
    soilMoisture: Number, // Percentage
    evapotranspiration: Number, // mm/day
    waterRequired: Number, // liters
    irrigationDuration: Number, // minutes
    priority: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low']
    },
    color: String
  }],
  
  // Weather-based recommendations
  weatherForecast: {
    nextRainExpected: Date,
    rainProbability: Number, // percentage
    temperature: Number,
    humidity: Number,
    windSpeed: Number
  },
  
  // AI recommendation
  recommendation: {
    shouldIrrigate: Boolean,
    reason: String,
    delayUntil: Date,
    totalWaterNeeded: Number, // liters
    estimatedDuration: Number, // minutes
    costEstimate: Number // INR
  },
  
  // Irrigation schedule
  scheduledTime: Date,
  completedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Actual usage tracking
  actualWaterUsed: Number,
  actualDuration: Number,
  savings: {
    waterSaved: Number, // liters
    costSaved: Number // INR
  }
});

export default mongoose.model('IrrigationSchedule', irrigationScheduleSchema);
