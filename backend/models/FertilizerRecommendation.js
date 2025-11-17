import mongoose from 'mongoose';

const fertilizerRecommendationSchema = new mongoose.Schema({
  fieldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Field',
    required: true
  },
  
  analysisDate: {
    type: Date,
    default: Date.now
  },
  
  // Overall field health
  overallHealthScore: Number,
  averageNDVI: Number,
  
  // Nutrient deficiency zones
  nutrientZones: [{
    zoneName: String,
    zoneId: String,
    areaHectares: Number,
    boundary: {
      type: {
        type: String,
        enum: ['Polygon']
      },
      coordinates: [[[Number]]]
    },
    
    // Detected deficiencies
    deficiencies: [{
      nutrient: {
        type: String,
        enum: ['nitrogen', 'phosphorus', 'potassium', 'organic-matter', 'micronutrients']
      },
      severity: {
        type: String,
        enum: ['severe', 'moderate', 'mild']
      },
      currentLevel: String,
      optimalLevel: String
    }],
    
    // NPK recommendations
    npkRecommendation: {
      nitrogen: Number, // kg/hectare
      phosphorus: Number,
      potassium: Number,
      totalPerZone: Number // kg
    },
    
    // Application method
    applicationMethod: String,
    estimatedCost: Number, // INR per zone
    priority: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low']
    },
    color: String
  }],
  
  // Total requirements
  totalRequirement: {
    nitrogen: Number,
    phosphorus: Number,
    potassium: Number,
    totalWeight: Number, // kg
    totalCost: Number // INR
  },
  
  // Cost savings
  savings: {
    comparedToUniform: Number, // INR saved vs uniform application
    optimizationPercentage: Number
  },
  
  // Application schedule
  recommendedDate: Date,
  appliedDate: Date,
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'partial', 'completed'],
    default: 'pending'
  }
});

export default mongoose.model('FertilizerRecommendation', fertilizerRecommendationSchema);
