import SensorData from '../models/SensorData.js';
import AggregatedSensorData from '../models/AggregatedSensorData.js';

/**
 * Sensor Aggregation Service
 * Calculates rolling averages, exponential weighted averages, and seasonal patterns
 */

// Calculate standard deviation
function calculateStdDev(values) {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

// Calculate exponential weighted average (emphasizes recent readings)
function calculateEWA(values, alpha = 0.3) {
  if (values.length === 0) return 0;
  
  let ewa = values[0];
  for (let i = 1; i < values.length; i++) {
    ewa = alpha * values[i] + (1 - alpha) * ewa;
  }
  return ewa;
}

// Determine season based on month
function getSeason(date) {
  const month = date.getMonth() + 1; // 1-12
  
  // Kharif (Monsoon): June-October
  if (month >= 6 && month <= 10) return 'Kharif';
  
  // Rabi (Winter): November-March
  if (month >= 11 || month <= 3) return 'Rabi';
  
  // Summer: April-May
  if (month >= 4 && month <= 5) return 'Summer';
  
  return 'Unknown';
}

/**
 * Aggregate sensor data for a specific time window
 * @param {Object} options - { farmerId, hours, aggregationPeriod }
 * @returns {Object} - Aggregated data
 */
export async function aggregateSensorData(options = {}) {
  const { farmerId = null, hours = 24, aggregationPeriod = 'hourly' } = options;
  
  try {
    console.log(`\n📊 [Aggregation] Creating ${aggregationPeriod} aggregation for last ${hours} hours`);
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
    
    // Query sensor data
    const query = { timestamp: { $gte: startTime, $lte: endTime } };
    if (farmerId) query.farmerId = farmerId;
    
    const readings = await SensorData.find(query).sort({ timestamp: 1 });
    
    if (readings.length === 0) {
      console.log('⚠️  No sensor data available for aggregation');
      return null;
    }
    
    console.log(`✅ Found ${readings.length} readings for aggregation`);
    
    // Extract values
    const temperatures = readings.map(r => r.temperature);
    const humidities = readings.map(r => r.humidity);
    const soilMoistures = readings.map(r => r.soilMoisture);
    const pHs = readings.map(r => r.pH);
    const rainfalls = readings.map(r => r.rainfall || 0);
    
    // Calculate basic aggregates
    const aggregates = {
      farmerId,
      aggregationPeriod,
      startTime,
      endTime,
      sampleCount: readings.length,
      
      temperature: {
        avg: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
        min: Math.min(...temperatures),
        max: Math.max(...temperatures),
        stdDev: calculateStdDev(temperatures)
      },
      
      humidity: {
        avg: humidities.reduce((a, b) => a + b, 0) / humidities.length,
        min: Math.min(...humidities),
        max: Math.max(...humidities),
        stdDev: calculateStdDev(humidities)
      },
      
      soilMoisture: {
        avg: soilMoistures.reduce((a, b) => a + b, 0) / soilMoistures.length,
        min: Math.min(...soilMoistures),
        max: Math.max(...soilMoistures),
        stdDev: calculateStdDev(soilMoistures)
      },
      
      pH: {
        avg: pHs.reduce((a, b) => a + b, 0) / pHs.length,
        min: Math.min(...pHs),
        max: Math.max(...pHs),
        stdDev: calculateStdDev(pHs)
      },
      
      rainfall: {
        total: rainfalls.reduce((a, b) => a + b, 0),
        avg: rainfalls.reduce((a, b) => a + b, 0) / rainfalls.length,
        max: Math.max(...rainfalls)
      }
    };
    
    // Calculate rolling averages (24-hour window)
    aggregates.rollingAverages = {
      temperature_24h: aggregates.temperature.avg,
      humidity_24h: aggregates.humidity.avg,
      soilMoisture_24h: aggregates.soilMoisture.avg,
      pH_24h: aggregates.pH.avg,
      rainfall_24h: aggregates.rainfall.total
    };
    
    // Calculate exponential weighted averages
    aggregates.exponentialAverages = {
      temperature: calculateEWA(temperatures),
      humidity: calculateEWA(humidities),
      soilMoisture: calculateEWA(soilMoistures),
      pH: calculateEWA(pHs)
    };
    
    // Seasonal pattern
    aggregates.seasonalPattern = {
      season: getSeason(endTime),
      monthlyAvg: {
        temperature: aggregates.temperature.avg,
        humidity: aggregates.humidity.avg,
        soilMoisture: aggregates.soilMoisture.avg,
        rainfall: aggregates.rainfall.avg
      }
    };
    
    // Data quality metrics
    const expectedReadings = hours * 12; // Assuming 1 reading per 5 minutes
    const completeness = Math.min((readings.length / expectedReadings) * 100, 100);
    
    // Detect outliers (values beyond 2 standard deviations)
    let outliers = 0;
    readings.forEach(r => {
      const tempOutlier = Math.abs(r.temperature - aggregates.temperature.avg) > 2 * aggregates.temperature.stdDev;
      const humidityOutlier = Math.abs(r.humidity - aggregates.humidity.avg) > 2 * aggregates.humidity.stdDev;
      if (tempOutlier || humidityOutlier) outliers++;
    });
    
    aggregates.dataQuality = {
      completeness: Math.round(completeness),
      reliability: Math.round(Math.max(100 - (outliers / readings.length) * 100, 0)),
      outliers
    };
    
    console.log(`✅ [Aggregation] Complete - Avg Temp: ${aggregates.temperature.avg.toFixed(2)}°C, Samples: ${readings.length}`);
    
    return aggregates;
    
  } catch (error) {
    console.error('❌ [Aggregation] Error:', error.message);
    throw error;
  }
}

/**
 * Store aggregated data in MongoDB
 */
export async function storeAggregatedData(aggregates) {
  try {
    const aggregatedDoc = new AggregatedSensorData(aggregates);
    await aggregatedDoc.save();
    
    console.log(`💾 [Aggregation] Saved to MongoDB with ID: ${aggregatedDoc._id}`);
    return aggregatedDoc;
    
  } catch (error) {
    console.error('❌ [Aggregation] Storage error:', error.message);
    throw error;
  }
}

/**
 * Get latest aggregated data
 */
export async function getLatestAggregation(farmerId = null, aggregationPeriod = 'hourly') {
  try {
    const query = { aggregationPeriod };
    if (farmerId) query.farmerId = farmerId;
    
    const latest = await AggregatedSensorData.findOne(query).sort({ endTime: -1 });
    
    if (!latest) {
      console.log('⚠️  No aggregated data found, creating new aggregation...');
      const aggregates = await aggregateSensorData({ farmerId, hours: 24, aggregationPeriod });
      if (aggregates) {
        return await storeAggregatedData(aggregates);
      }
      return null;
    }
    
    // Check if aggregation is stale (>1 hour old)
    const ageInHours = (new Date() - latest.endTime) / (1000 * 60 * 60);
    if (ageInHours > 1) {
      console.log(`🔄 [Aggregation] Data is ${ageInHours.toFixed(1)}h old, creating fresh aggregation...`);
      const aggregates = await aggregateSensorData({ farmerId, hours: 24, aggregationPeriod });
      if (aggregates) {
        return await storeAggregatedData(aggregates);
      }
    }
    
    return latest;
    
  } catch (error) {
    console.error('❌ [Aggregation] Fetch error:', error.message);
    throw error;
  }
}

/**
 * Compare aggregated data with real-time reading
 */
export async function compareAggregatedWithRealtime(realtimeReading, farmerId = null) {
  try {
    const aggregated = await getLatestAggregation(farmerId);
    
    if (!aggregated) {
      return {
        hasComparison: false,
        message: 'No historical data available for comparison'
      };
    }
    
    const comparison = aggregated.compareWithRealtime(realtimeReading);
    
    // Update aggregated document with comparison metrics
    await aggregated.save();
    
    console.log(`📊 [Comparison] Deviation: ${comparison.deviation.toFixed(2)}% - ${comparison.isStable ? 'STABLE' : 'UNSTABLE'}`);
    
    return {
      hasComparison: true,
      aggregated: {
        temperature: aggregated.temperature.avg,
        humidity: aggregated.humidity.avg,
        soilMoisture: aggregated.soilMoisture.avg,
        pH: aggregated.pH.avg,
        period: `${aggregated.startTime.toISOString()} to ${aggregated.endTime.toISOString()}`,
        sampleCount: aggregated.sampleCount
      },
      realtime: realtimeReading,
      comparison,
      recommendation: comparison.isStable 
        ? 'Real-time reading matches historical pattern - prediction reliable'
        : 'Real-time reading deviates from historical pattern - use aggregated values for better accuracy'
    };
    
  } catch (error) {
    console.error('❌ [Comparison] Error:', error.message);
    throw error;
  }
}

/**
 * Auto-aggregation scheduler (called periodically)
 */
export async function autoAggregateHourly() {
  try {
    console.log('\n⏰ [Auto-Aggregation] Running hourly aggregation...');
    
    // Get all unique farmers with sensor data
    const farmers = await SensorData.distinct('farmerId');
    
    for (const farmerId of farmers) {
      if (!farmerId) continue; // Skip null farmerId
      
      const aggregates = await aggregateSensorData({ farmerId, hours: 24, aggregationPeriod: 'hourly' });
      if (aggregates) {
        await storeAggregatedData(aggregates);
      }
    }
    
    // Also create a global aggregation (all farmers)
    const globalAggregates = await aggregateSensorData({ farmerId: null, hours: 24, aggregationPeriod: 'hourly' });
    if (globalAggregates) {
      await storeAggregatedData(globalAggregates);
    }
    
    console.log('✅ [Auto-Aggregation] Complete');
    
  } catch (error) {
    console.error('❌ [Auto-Aggregation] Error:', error.message);
  }
}
