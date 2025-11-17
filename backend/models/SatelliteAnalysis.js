import mongoose from 'mongoose';

const satelliteAnalysisSchema = new mongoose.Schema({
  fieldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Field',
    required: true
  },
  
  // Satellite image metadata
  acquisitionDate: {
    type: Date,
    required: true
  },
  satelliteName: {
    type: String,
    default: 'Sentinel-2'
  },
  cloudCover: {
    type: Number,
    min: 0,
    max: 100
  },
  resolution: {
    type: Number,
    default: 10 // meters
  },
  
  // NDVI analysis results
  meanNdvi: {
    type: Number,
    required: true
  },
  healthScore: {
    type: Number, // 0-100
    required: true
  },
  
  // Stress zones detected
  zones: [{
    zoneName: String,
    stressLevel: {
      type: String,
      enum: ['critical', 'moderate', 'healthy']
    },
    boundary: {
      type: {
        type: String,
        enum: ['Polygon']
      },
      coordinates: [[[Number]]]
    },
    areaHectares: Number,
    meanNdvi: Number,
    pixelCount: Number,
    color: String // Hex color for visualization
  }],
  
  // Recommended sensor placements
  sensorPlacements: [{
    zoneId: String,
    placementNumber: Number,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    gps: {
      lat: Number,
      lng: Number
    },
    reason: String,
    installationStatus: {
      type: String,
      enum: ['pending', 'installed', 'skipped'],
      default: 'pending'
    },
    installedSensorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sensor'
    }
  }],
  
  totalSensorsNeeded: Number,
  
  // File paths for visualization
  ndviMapPath: String,
  zoneMapPath: String,
  
  analysisDate: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('SatelliteAnalysis', satelliteAnalysisSchema);
