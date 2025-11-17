import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  registrationType: {
    type: String,
    enum: ['gps', 'polygon', 'survey'],
    required: true
  },
  // GPS data
  centerLat: Number,
  centerLng: Number,
  radiusMeters: Number,
  
  // Polygon boundary (GeoJSON)
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of coordinate pairs
      required: true
    }
  },
  
  // Area calculation
  areaHectares: {
    type: Number,
    required: true
  },
  
  // Survey number (optional)
  surveyNumber: String,
  state: String,
  district: String,
  taluk: String,
  village: String,
  
  // Metadata
  soilType: String,
  cropType: String,
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'unverified'],
    default: 'pending'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index for location queries
fieldSchema.index({ boundary: '2dsphere' });

export default mongoose.model('Field', fieldSchema);
