import mongoose from 'mongoose';

/**
 * CropPrediction Model - Simple storage for ML predictions with farmer info
 * Used for Crop Frequency Insight feature
 */
const cropPredictionSchema = new mongoose.Schema({
  farmerId: {
    type: String,  // Simple string ID (can be farmer name, phone, or ID)
    required: true
  },
  predictedCrop: {
    type: String,
    required: true
  },
  area: {
    type: Number,  // Area in hectares
    required: true
  },
  region: {
    type: String,
    required: true,
    default: 'Tumkur'
  },
  season: {
    type: String,
    required: true,
    default: 'Rabi 2025'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
cropPredictionSchema.index({ region: 1, season: 1 });
cropPredictionSchema.index({ predictedCrop: 1, region: 1, season: 1 });
cropPredictionSchema.index({ farmerId: 1 });

export default mongoose.model('CropPrediction', cropPredictionSchema);
