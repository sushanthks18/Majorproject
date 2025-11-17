import express from 'express';
import IrrigationSchedule from '../models/IrrigationSchedule.js';
import FertilizerRecommendation from '../models/FertilizerRecommendation.js';
import SatelliteAnalysis from '../models/SatelliteAnalysis.js';
import SensorData from '../models/SensorData.js';
import Field from '../models/Field.js';
import { authenticate } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

// Generate AI-powered irrigation schedule
router.post('/schedule/:fieldId', authenticate, async (req, res) => {
  try {
    const { fieldId } = req.params;
    
    // Verify field ownership
    const field = await Field.findOne({ _id: fieldId, farmerId: req.userId });
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    // Get latest satellite analysis (optional)
    const analysis = await SatelliteAnalysis.findOne({ fieldId })
      .sort({ acquisitionDate: -1 });
    
    // Get latest sensor data
    const latestSensor = await SensorData.findOne({ farmerId: req.userId })
      .sort({ timestamp: -1 });
    
    // Fetch weather forecast (mock for demo)
    const weather = await getWeatherForecast(field.centerLat, field.centerLng);
    
    let irrigationZones = [];
    
    if (analysis && analysis.zones && analysis.zones.length > 0) {
      // Use satellite analysis zones
      irrigationZones = analysis.zones.map(zone => {
        // Calculate water stress based on NDVI
        let waterStressLevel = 'optimal';
        let priority = 'low';
        
        if (zone.meanNdvi < 0.4) {
          waterStressLevel = 'critical';
          priority = 'urgent';
        } else if (zone.meanNdvi < 0.6) {
          waterStressLevel = 'moderate';
          priority = 'high';
        } else if (zone.meanNdvi < 0.7) {
          waterStressLevel = 'low';
          priority = 'medium';
        }
        
        // Calculate water needed (simplified)
        const soilMoisture = latestSensor?.soilMoisture || 45;
        const et = calculateET(weather.temperature, weather.humidity, weather.windSpeed);
        const waterRequired = Math.round(zone.areaHectares * 10000 * (70 - soilMoisture) / 100); // liters
        const irrigationDuration = Math.round(waterRequired / 200); // assuming 200 L/min flow
        
        return {
          zoneName: zone.zoneName,
          zoneId: zone._id,
          waterStressLevel,
          soilMoisture,
          evapotranspiration: et,
          waterRequired,
          irrigationDuration,
          priority,
          color: getWaterStressColor(waterStressLevel)
        };
      });
    } else {
      // Create single zone based on entire field (fallback when no satellite data)
      const soilMoisture = latestSensor?.soilMoisture || 45;
      const et = calculateET(weather.temperature, weather.humidity, weather.windSpeed);
      
      let waterStressLevel = 'moderate';
      let priority = 'medium';
      
      if (soilMoisture < 30) {
        waterStressLevel = 'critical';
        priority = 'urgent';
      } else if (soilMoisture < 50) {
        waterStressLevel = 'moderate';
        priority = 'high';
      } else if (soilMoisture < 65) {
        waterStressLevel = 'low';
        priority = 'medium';
      } else {
        waterStressLevel = 'optimal';
        priority = 'low';
      }
      
      const waterRequired = Math.round(field.areaHectares * 10000 * (70 - soilMoisture) / 100);
      const irrigationDuration = Math.round(waterRequired / 200);
      
      irrigationZones = [{
        zoneName: 'Entire Field',
        zoneId: 'field-zone',
        waterStressLevel,
        soilMoisture,
        evapotranspiration: et,
        waterRequired,
        irrigationDuration,
        priority,
        color: getWaterStressColor(waterStressLevel)
      }];
    }
    
    // AI decision logic
    const totalWaterNeeded = irrigationZones.reduce((sum, z) => sum + z.waterRequired, 0);
    const estimatedDuration = Math.max(...irrigationZones.map(z => z.irrigationDuration));
    const waterCostPerLiter = 0.02; // INR
    const costEstimate = Math.round(totalWaterNeeded * waterCostPerLiter);
    
    let shouldIrrigate = true;
    let reason = 'Zones require irrigation based on soil moisture and NDVI analysis';
    let delayUntil = null;
    
    // Check weather forecast
    if (weather.rainProbability > 70 && weather.nextRainExpected) {
      const hoursUntilRain = (new Date(weather.nextRainExpected) - new Date()) / (1000 * 60 * 60);
      if (hoursUntilRain < 24) {
        shouldIrrigate = false;
        reason = `Don't irrigate - Rain expected in ${Math.round(hoursUntilRain)} hours (${weather.rainProbability}% probability)`;
        delayUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
    }
    
    // Check if soil moisture is adequate
    if (latestSensor?.soilMoisture > 65) {
      shouldIrrigate = false;
      reason = 'Soil moisture is adequate (>65%). No irrigation needed.';
    }
    
    // Create irrigation schedule
    const schedule = new IrrigationSchedule({
      fieldId,
      zones: irrigationZones,
      weatherForecast: weather,
      recommendation: {
        shouldIrrigate,
        reason,
        delayUntil,
        totalWaterNeeded,
        estimatedDuration,
        costEstimate
      },
      status: shouldIrrigate ? 'pending' : 'cancelled'
    });
    
    await schedule.save();
    
    console.log(`✅ Irrigation schedule generated for field ${fieldId}`);
    
    res.json({
      success: true,
      schedule
    });
  } catch (error) {
    console.error('Error generating irrigation schedule:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get irrigation schedules
router.get('/schedules/:fieldId', authenticate, async (req, res) => {
  try {
    const { fieldId } = req.params;
    
    const field = await Field.findOne({ _id: fieldId, farmerId: req.userId });
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    const schedules = await IrrigationSchedule.find({ fieldId })
      .sort({ analysisDate: -1 })
      .limit(10);
    
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate fertilizer optimization map
router.post('/fertilizer/:fieldId', authenticate, async (req, res) => {
  try {
    const { fieldId } = req.params;
    
    const field = await Field.findOne({ _id: fieldId, farmerId: req.userId });
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    // Get latest satellite analysis
    const analysis = await SatelliteAnalysis.findOne({ fieldId })
      .sort({ acquisitionDate: -1 });
    
    if (!analysis) {
      return res.status(404).json({ 
        error: 'No satellite analysis found. Please run NDVI analysis first.' 
      });
    }
    
    // Analyze nutrient deficiency based on NDVI patterns
    const nutrientZones = analysis.zones.map(zone => {
      const deficiencies = [];
      let npkRecommendation = {
        nitrogen: 0,
        phosphorus: 0,
        potassium: 0,
        totalPerZone: 0
      };
      
      // Nitrogen deficiency (low NDVI in vegetative stage)
      if (zone.meanNdvi < 0.5) {
        deficiencies.push({
          nutrient: 'nitrogen',
          severity: 'severe',
          currentLevel: 'Low (<150 kg/ha)',
          optimalLevel: '200-250 kg/ha'
        });
        npkRecommendation.nitrogen = 50; // kg/hectare
      } else if (zone.meanNdvi < 0.65) {
        deficiencies.push({
          nutrient: 'nitrogen',
          severity: 'moderate',
          currentLevel: 'Medium (150-200 kg/ha)',
          optimalLevel: '200-250 kg/ha'
        });
        npkRecommendation.nitrogen = 30;
      }
      
      // Phosphorus (moderate deficiency)
      if (zone.meanNdvi < 0.6) {
        deficiencies.push({
          nutrient: 'phosphorus',
          severity: zone.meanNdvi < 0.4 ? 'severe' : 'moderate',
          currentLevel: 'Low',
          optimalLevel: '30-50 kg/ha'
        });
        npkRecommendation.phosphorus = zone.meanNdvi < 0.4 ? 25 : 15;
      }
      
      // Potassium
      if (zone.stressLevel === 'critical') {
        deficiencies.push({
          nutrient: 'potassium',
          severity: 'moderate',
          currentLevel: 'Low',
          optimalLevel: '40-60 kg/ha'
        });
        npkRecommendation.potassium = 20;
      }
      
      // Calculate total per zone
      npkRecommendation.totalPerZone = Math.round(
        (npkRecommendation.nitrogen + npkRecommendation.phosphorus + npkRecommendation.potassium) 
        * zone.areaHectares
      );
      
      // Cost estimation (INR per kg of NPK)
      const costPerKg = 25;
      const estimatedCost = Math.round(npkRecommendation.totalPerZone * costPerKg);
      
      let priority = 'low';
      if (zone.stressLevel === 'critical') priority = 'urgent';
      else if (zone.stressLevel === 'moderate') priority = 'high';
      
      return {
        zoneName: zone.zoneName,
        zoneId: zone._id,
        areaHectares: zone.areaHectares,
        boundary: zone.boundary,
        deficiencies,
        npkRecommendation,
        applicationMethod: 'Drip fertigation (recommended) or broadcast',
        estimatedCost,
        priority,
        color: zone.color
      };
    });
    
    // Calculate totals
    const totalRequirement = {
      nitrogen: nutrientZones.reduce((sum, z) => sum + z.npkRecommendation.nitrogen * z.areaHectares, 0),
      phosphorus: nutrientZones.reduce((sum, z) => sum + z.npkRecommendation.phosphorus * z.areaHectares, 0),
      potassium: nutrientZones.reduce((sum, z) => sum + z.npkRecommendation.potassium * z.areaHectares, 0),
      totalWeight: 0,
      totalCost: 0
    };
    
    totalRequirement.totalWeight = Math.round(
      totalRequirement.nitrogen + totalRequirement.phosphorus + totalRequirement.potassium
    );
    totalRequirement.totalCost = nutrientZones.reduce((sum, z) => sum + z.estimatedCost, 0);
    
    // Calculate savings vs uniform application
    const uniformCost = field.areaHectares * 95 * 25; // 95 kg/ha uniform NPK @ INR 25/kg
    const savings = {
      comparedToUniform: Math.round(uniformCost - totalRequirement.totalCost),
      optimizationPercentage: Math.round(((uniformCost - totalRequirement.totalCost) / uniformCost) * 100)
    };
    
    // Create recommendation
    const recommendation = new FertilizerRecommendation({
      fieldId,
      overallHealthScore: analysis.healthScore,
      averageNDVI: analysis.meanNdvi,
      nutrientZones,
      totalRequirement,
      savings,
      recommendedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'pending'
    });
    
    await recommendation.save();
    
    console.log(`✅ Fertilizer recommendation generated for field ${fieldId}`);
    
    res.json({
      success: true,
      recommendation
    });
  } catch (error) {
    console.error('Error generating fertilizer recommendation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get fertilizer recommendations
router.get('/fertilizer/:fieldId', authenticate, async (req, res) => {
  try {
    const { fieldId } = req.params;
    
    const field = await Field.findOne({ _id: fieldId, farmerId: req.userId });
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    const recommendations = await FertilizerRecommendation.find({ fieldId })
      .sort({ analysisDate: -1 })
      .limit(10);
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper functions
function getWeatherForecast(lat, lng) {
  // Mock weather forecast (in production, use OpenWeatherMap API)
  const rainProbability = Math.random() * 100;
  const willRain = rainProbability > 70;
  
  return {
    nextRainExpected: willRain ? new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000) : null,
    rainProbability: Math.round(rainProbability),
    temperature: 25 + Math.random() * 10,
    humidity: 50 + Math.random() * 30,
    windSpeed: 5 + Math.random() * 10
  };
}

function calculateET(temp, humidity, windSpeed) {
  // Simplified Penman-Monteith equation
  // Handle invalid inputs
  if (!temp || !humidity || !windSpeed || isNaN(temp) || isNaN(humidity) || isNaN(windSpeed)) {
    return 4.5; // Default ET value in mm/day
  }
  
  // Ensure temperature is greater than humidity to avoid sqrt of negative number
  const tempDiff = Math.max(temp - humidity, 0);
  const et = 0.0023 * (temp + 17.8) * Math.sqrt(tempDiff) * windSpeed * 0.5;
  
  // Ensure valid result
  if (isNaN(et) || et < 0) {
    return 4.5; // Default ET value
  }
  
  return Math.round(et * 100) / 100;
}

function getWaterStressColor(level) {
  const colors = {
    critical: '#dc2626',
    moderate: '#f59e0b',
    low: '#eab308',
    optimal: '#22c55e'
  };
  return colors[level] || '#6b7280';
}

export default router;
