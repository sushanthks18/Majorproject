import mongoose from 'mongoose';

/**
 * CropPlan Model - Tracks farmer crop selection to prevent regional oversupply
 * Helps diversify crop recommendations based on what others in region are planning
 */
const cropPlanSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fieldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Field',
    required: true
  },
  selectedCrop: {
    type: String,
    required: true
  },
  areaHectares: {
    type: Number,
    required: true
  },
  season: {
    type: String,
    enum: ['kharif', 'rabi', 'zaid', 'year-round'],
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  // Regional info for diversification
  region: {
    state: String,
    district: String,
    taluk: String
  },
  // Market awareness
  expectedMarketPrice: Number,
  expectedYield: Number,
  profitabilityScore: Number,
  
  // Status
  status: {
    type: String,
    enum: ['planned', 'sowing', 'growing', 'harvested', 'cancelled'],
    default: 'planned'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
cropPlanSchema.index({ 'region.district': 1, 'region.taluk': 1, year: 1, season: 1 });
cropPlanSchema.index({ farmerId: 1, year: 1, season: 1 });
cropPlanSchema.index({ selectedCrop: 1, year: 1, season: 1 });

export default mongoose.model('CropPlan', cropPlanSchema);
