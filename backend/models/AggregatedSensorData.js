import mongoose from 'mongoose';

/**
 * Aggregated Sensor Data Model
 * Stores rolling window averages and historical patterns for improved ML predictions
 */
const aggregatedSensorDataSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Aggregation time window
  aggregationPeriod: {
    type: String,
    enum: ['hourly', 'daily', 'weekly'],
    default: 'hourly'
  },
  
  // Time window for this aggregation
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  
  // Aggregated sensor values (averages)
  temperature: {
    avg: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    stdDev: { type: Number, default: 0 }
  },
  
  humidity: {
    avg: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    stdDev: { type: Number, default: 0 }
  },
  
  soilMoisture: {
    avg: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    stdDev: { type: Number, default: 0 }
  },
  
  pH: {
    avg: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    stdDev: { type: Number, default: 0 }
  },
  
  rainfall: {
    total: { type: Number, required: true },
    avg: { type: Number, required: true },
    max: { type: Number, default: 0 }
  },
  
  // Number of readings used for aggregation
  sampleCount: {
    type: Number,
    required: true
  },
  
  // Rolling window averages (for trend analysis)
  rollingAverages: {
    temperature_24h: { type: Number },
    humidity_24h: { type: Number },
    soilMoisture_24h: { type: Number },
    pH_24h: { type: Number },
    rainfall_24h: { type: Number }
  },
  
  // Exponential weighted averages (emphasizes recent data)
  exponentialAverages: {
    temperature: { type: Number },
    humidity: { type: Number },
    soilMoisture: { type: Number },
    pH: { type: Number }
  },
  
  // Seasonal aggregates (for long-term pattern detection)
  seasonalPattern: {
    season: { 
      type: String, 
      enum: ['Kharif', 'Rabi', 'Summer', 'Unknown'],
      default: 'Unknown'
    },
    monthlyAvg: {
      temperature: { type: Number },
      humidity: { type: Number },
      soilMoisture: { type: Number },
      rainfall: { type: Number }
    }
  },
  
  // Data quality metrics
  dataQuality: {
    completeness: { type: Number, default: 100 }, // % of expected readings received
    reliability: { type: Number, default: 100 },  // % of readings within normal range
    outliers: { type: Number, default: 0 }        // Number of outlier readings detected
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Flag for validation framework usage
  usedForPrediction: {
    type: Boolean,
    default: false
  },
  
  // Comparison with real-time
  comparisonMetrics: {
    deviationFromRealtime: { type: Number },
    trendDirection: { 
      type: String, 
      enum: ['increasing', 'decreasing', 'stable', 'unknown'],
      default: 'unknown'
    }
  }
});

// Indexes for faster queries
aggregatedSensorDataSchema.index({ farmerId: 1, endTime: -1 });
aggregatedSensorDataSchema.index({ aggregationPeriod: 1, endTime: -1 });
aggregatedSensorDataSchema.index({ startTime: 1, endTime: 1 });

// Method to compare with real-time reading
aggregatedSensorDataSchema.methods.compareWithRealtime = function(realtimeReading) {
  const tempDev = Math.abs(this.temperature.avg - realtimeReading.temperature);
  const humidityDev = Math.abs(this.humidity.avg - realtimeReading.humidity);
  const soilDev = Math.abs(this.soilMoisture.avg - realtimeReading.soilMoisture);
  const phDev = Math.abs(this.pH.avg - realtimeReading.pH);
  
  // Calculate average deviation percentage
  const avgDeviation = (
    (tempDev / this.temperature.avg) * 100 +
    (humidityDev / this.humidity.avg) * 100 +
    (soilDev / this.soilMoisture.avg) * 100 +
    (phDev / this.pH.avg) * 100
  ) / 4;
  
  this.comparisonMetrics.deviationFromRealtime = avgDeviation;
  
  return {
    deviation: avgDeviation,
    isStable: avgDeviation < 10, // Less than 10% deviation = stable
    details: {
      temperature: { aggregated: this.temperature.avg, realtime: realtimeReading.temperature, diff: tempDev },
      humidity: { aggregated: this.humidity.avg, realtime: realtimeReading.humidity, diff: humidityDev },
      soilMoisture: { aggregated: this.soilMoisture.avg, realtime: realtimeReading.soilMoisture, diff: soilDev },
      pH: { aggregated: this.pH.avg, realtime: realtimeReading.pH, diff: phDev }
    }
  };
};

export default mongoose.model('AggregatedSensorData', aggregatedSensorDataSchema);
