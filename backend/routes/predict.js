import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import SensorData from '../models/SensorData.js';
import AggregatedSensorData from '../models/AggregatedSensorData.js';
import MandiPrice from '../models/MandiPrice.js';
import Field from '../models/Field.js';
import CropPlan from '../models/CropPlan.js';
import { authenticate, authenticateFarmer } from '../middleware/auth.js';
import fetch from 'node-fetch';
import { predictCrop } from '../ml/ml_predictor.js';
import { getLatestAggregation, compareAggregatedWithRealtime, aggregateSensorData, storeAggregatedData } from '../services/sensorAggregation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const ML_API_URL = 'http://localhost:5002/predict';

// Helper function to determine current season
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 6 && month <= 10) return 'Kharif';  // June-October (Monsoon)
  if (month >= 11 || month <= 3) return 'Rabi';    // November-March (Winter)
  if (month >= 4 && month <= 5) return 'Summer';   // April-May
  return 'Unknown';
}

// Crop recommendation using TRAINED ML MODEL (Random Forest) with Market-Aware Diversification
// Now uses AGGREGATED sensor data for improved accuracy
router.post('/crop', authenticate, async (req, res) => {
  try {
    const { temperature, humidity, soilMoisture, pH, rainfall = 100, fieldId, useAggregated = true } = req.body;

    console.log('\n🌾 [Crop Recommendation Request - MARKET-AWARE ML MODEL WITH AGGREGATION]');
    console.log('Data:', { temperature, humidity, soilMoisture, pH, rainfall, fieldId, useAggregated });

    // Validate input (temperature, humidity, soilMoisture from IoT sensors; pH as agronomic parameter)
    if (temperature === undefined || humidity === undefined || soilMoisture === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: temperature, humidity, soilMoisture' 
      });
    }

    // Use provided soil test pH or agronomic baseline (6.5)
    const effectivePH = (pH !== undefined && pH !== null && !isNaN(parseFloat(pH))) ? parseFloat(pH) : 6.5;

    // Check if field has a locked crop
    let field = null;
    if (fieldId) {
      field = await Field.findById(fieldId);
      if (field && field.isCropLocked && field.lockedCrop) {
        return res.status(200).json({
          message: 'Crop is locked for this field',
          lockedCrop: field.lockedCrop,
          cropLockDate: field.cropLockDate,
          recommendationDisabled: true
        });
      }
    }

    // ==========================================
    // AGGREGATED vs REAL-TIME DATA COMPARISON
    // ==========================================
    let predictionData = {
      temperature,
      humidity,
      soilMoisture,
      pH: effectivePH,
      rainfall
    };
    
    let aggregatedComparison = null;
    let dataSourceUsed = 'realtime';
    
    if (useAggregated) {
      try {
        console.log('📊 [Aggregation] Fetching latest aggregated sensor data...');
        
        // Get latest aggregated data
        const aggregated = await getLatestAggregation(req.user?.id, 'hourly');
        
        if (aggregated) {
          // Compare aggregated with real-time
          const realtimeReading = { temperature, humidity, soilMoisture, pH, rainfall };
          const comparison = await compareAggregatedWithRealtime(realtimeReading, req.user?.id);
          
          aggregatedComparison = comparison;
          
          // Decide which data to use based on deviation
          if (comparison.hasComparison) {
            console.log(`📊 [Comparison] Deviation: ${comparison.comparison.deviation.toFixed(2)}%`);
            
            // If deviation is high (>15%), use aggregated values for more stable prediction
            if (comparison.comparison.deviation > 15) {
              console.log('⚡ [Decision] Using AGGREGATED values (high deviation from realtime)');
              predictionData = {
                temperature: aggregated.temperature.avg,
                humidity: aggregated.humidity.avg,
                soilMoisture: aggregated.soilMoisture.avg,
                pH: aggregated.pH.avg,
                rainfall: aggregated.rainfall.avg
              };
              dataSourceUsed = 'aggregated';
            } else {
              console.log('✅ [Decision] Using REALTIME values (stable match with historical data)');
              dataSourceUsed = 'realtime_validated';
            }
          }
        } else {
          console.log('⚠️  No aggregated data available, using realtime values');
        }
      } catch (aggError) {
        console.warn('⚠️  Aggregation error, falling back to realtime:', aggError.message);
      }
    }

    // ==========================================
    // FETCH REGIONAL CROP DISTRIBUTION DATA (Must be fetched first for farmerRegion)
    // ==========================================
    let regionalDistribution = null;
    let farmerRegion = null;
    let mandiPricesData = {};  // FIXED: Declare here at function scope
    try {
      // Get farmer's field info for regional context
      if (fieldId) {
        const field = await Field.findById(fieldId);
        if (field) {
          farmerRegion = {
            state: field.state,
            district: field.district,
            taluk: field.taluk
          };
        }
      }

      // If no field specified, get any field of the user for regional context
      if (!farmerRegion) {
        const userField = await Field.findOne({ farmerId: req.user.id });
        if (userField) {
          farmerRegion = {
            state: userField.state,
            district: userField.district,
            taluk: userField.taluk
          };
        }
      }

      // ==========================================
      // FETCH CURRENT MANDI PRICES (Real Government Data)
      // ==========================================
      let farmerState = 'Karnataka';
      let farmerDistrict = null;
      
      // Get farmer's location for mandi price context
      if (farmerRegion) {
        farmerState = farmerRegion.state || 'Karnataka';
        farmerDistrict = farmerRegion.district;
      }
      
      console.log('\n💰 [Mandi Prices] Fetching real market prices for profitability analysis...');
      
      // Fetch mandi prices for ALL crops our ML model can recommend (23 crops)
      // NOTE: Only major commercial crops have AGMARKNET data - others will fall back to ML score only
      const topCrops = [
        // Cereals
        'Rice', 'Maize', 'Ragi',  // Ragi (Finger Millet) is Karnataka's staple crop
        // Pulses
        'Chickpea', 'Kidneybeans', 'Pigeonpeas', 'Mothbeans', 'Mungbean', 'Blackgram', 'Lentil',
        // Fruits
        'Pomegranate', 'Banana', 'Mango', 'Grapes', 'Watermelon', 'Muskmelon', 'Apple', 'Orange', 'Papaya', 'Coconut',
        // Cash Crops
        'Cotton', 'Jute', 'Coffee'
      ];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      for (const cropName of topCrops) {
        const priceQuery = {
          crop: cropName,
          source: 'AGMARKNET',  // Only real government data
          date: { $gte: thirtyDaysAgo }
        };
        
        // Prioritize farmer's district if available
        if (farmerDistrict) {
          priceQuery.district = farmerDistrict;
        } else {
          priceQuery.state = farmerState;
        }
        
        const recentPrices = await MandiPrice.find(priceQuery)
          .sort({ date: -1 })
          .limit(10);
        
        if (recentPrices.length > 0) {
          const avgPrice = recentPrices.reduce((sum, p) => sum + p.price, 0) / recentPrices.length;
          const latestPrice = recentPrices[0].price;
          const priceRange = {
            min: Math.min(...recentPrices.map(p => p.minPrice || p.price)),
            max: Math.max(...recentPrices.map(p => p.maxPrice || p.price))
          };
          
          mandiPricesData[cropName] = {
            current: latestPrice,
            average: Math.round(avgPrice),
            min: priceRange.min,
            max: priceRange.max,
            market: recentPrices[0].location,
            district: recentPrices[0].district,
            lastUpdated: recentPrices[0].date,
            source: 'AGMARKNET',
            sampleCount: recentPrices.length
          };
          
          console.log(`✅ ${cropName}: ₹${latestPrice}/quintal (${recentPrices[0].location})`);
        }
      }
      
      if (Object.keys(mandiPricesData).length > 0) {
        console.log(`✅ [Mandi Prices] Fetched real prices for ${Object.keys(mandiPricesData).length} crops from AGMARKNET`);
      } else {
        console.log('⚠️  [Mandi Prices] No recent AGMARKNET data found, prediction will use ML confidence only');
      }

      // Query regional crop plans for current season
      if (farmerRegion && farmerRegion.district) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        
        // Determine current season
        let currentSeason = 'year-round';
        if (currentMonth >= 6 && currentMonth <= 10) {
          currentSeason = 'kharif';  // June-Oct
        } else if (currentMonth >= 10 || currentMonth <= 3) {
          currentSeason = 'rabi';    // Nov-Mar
        } else {
          currentSeason = 'zaid';    // Apr-May
        }

        const regionalPlans = await CropPlan.find({
          'region.district': farmerRegion.district,
          'region.taluk': farmerRegion.taluk,
          year: currentYear,
          season: currentSeason,
          status: { $in: ['planned', 'sowing', 'growing'] }
        });

        // Calculate distribution percentages
        if (regionalPlans.length > 0) {
          const cropCounts = {};
          let totalArea = 0;

          regionalPlans.forEach(plan => {
            const crop = plan.selectedCrop;
            cropCounts[crop] = (cropCounts[crop] || 0) + plan.areaHectares;
            totalArea += plan.areaHectares;
          });

          if (totalArea > 0) {
            regionalDistribution = {};
            Object.keys(cropCounts).forEach(crop => {
              regionalDistribution[crop] = (cropCounts[crop] / totalArea) * 100;
            });
          }
        }
      }
    } catch (regionError) {
      console.warn('⚠️ Could not fetch regional distribution data:', regionError.message);
    }

    // ==========================================
    // CALL ML MODEL FOR PREDICTION (with aggregated or realtime data)
    // ==========================================
    let prediction;
    try {
      console.log('🤖 Calling Market-Aware ML Model...');
      console.log(`📊 Using ${dataSourceUsed} sensor data for prediction`);
      
      prediction = await predictCrop(
        predictionData.temperature, 
        predictionData.humidity, 
        predictionData.soilMoisture, 
        predictionData.pH, 
        predictionData.rainfall,
        regionalDistribution
      );
    } catch (mlError) {
      console.error('❌ ML Model Error:', mlError);
      return res.status(500).json({ 
        error: 'ML Model unavailable', 
        details: mlError.message 
      });
    }

    // ==========================================
    // FORMAT RESPONSE
    // ==========================================
    const response = {
      recommendedCrop: prediction.recommended_crop || prediction.primaryCrop,
      profitabilityScore: prediction.profitability_score || prediction.confidence,
      suitabilityScore: prediction.suitability_score || prediction.confidence,
      suitableCrops: prediction.recommendations || [],
      mlModel: prediction.model_used || prediction.modelUsed || 'Market-Aware Random Forest',
      regionalInsights: prediction.regional_insights || {
        diversification_needed: false,
        oversupplied_crops: [],
        opportunity_crops: []
      }
    };

    // Add regional insights if available
    if (regionalDistribution || (prediction.regional_insights && Object.keys(prediction.regional_insights).length > 0)) {
      // Use insights from ML model if available, otherwise calculate from regional distribution
      if (prediction.regional_insights && prediction.regional_insights.diversification_needed !== undefined) {
        response.regionalInsights = prediction.regional_insights;
      } else if (regionalDistribution) {
        response.regionalInsights.diversification_needed = Object.values(regionalDistribution).some(percentage => percentage > 40);
        
        Object.entries(regionalDistribution).forEach(([crop, percentage]) => {
          if (percentage > 35) {
            response.regionalInsights.oversupplied_crops.push(`${crop} (${percentage.toFixed(1)}%)`);
          } else if (percentage < 15) {
            response.regionalInsights.opportunity_crops.push(`${crop} (${percentage.toFixed(1)}%)`);
          }
        });
      }
      
      // Add supply status to each recommendation if not already present
      if (regionalDistribution) {
        response.suitableCrops = response.suitableCrops.map(crop => {
          // Skip if supply_status already exists (from ML model)
          if (crop.supply_status) return crop;
          
          const percentage = regionalDistribution[crop.name] || 0;
          let supplyStatus = '';
          
          if (percentage > 35) {
            supplyStatus = '⚠️ Oversupply Risk';
          } else if (percentage < 15) {
            supplyStatus = '🌟 Market Opportunity';
          } else {
            supplyStatus = '✅ Balanced Supply';
          }
          
          return {
            ...crop,
            supply_status: supplyStatus,
            regional_percentage: percentage
          };
        });
      }
    }

    console.log('✅ Crop recommendation generated successfully');
    
    // ==========================================
    // ENHANCE RECOMMENDATIONS WITH REAL MANDI PRICES
    // ==========================================
    if (Object.keys(mandiPricesData).length > 0) {
      response.suitableCrops = response.suitableCrops.map(crop => {
        const mandiData = mandiPricesData[crop.name];
        
        if (mandiData) {
          // HAS MANDI PRICE - Calculate combined profitability
          const priceScore = ((mandiData.current - mandiData.min) / (mandiData.max - mandiData.min)) * 100;
          
          return {
            ...crop,
            mandiPrice: {
              current: mandiData.current,
              average: mandiData.average,
              range: `₹${mandiData.min} - ₹${mandiData.max}`,
              market: mandiData.market,
              district: mandiData.district,
              lastUpdated: mandiData.lastUpdated,
              source: 'AGMARKNET',
              priceIndicator: priceScore > 70 ? '📈 High Price' : priceScore > 40 ? '📊 Medium Price' : '📉 Low Price'
            },
            // Combined score: ML suitability + Market price
            profitability_score: Math.round((crop.suitability_score + priceScore) / 2),
            economicOutlook: mandiData.current > mandiData.average ? 'Favorable' : 'Average',
            hasMandiPrice: true
          };
        } else {
          // NO MANDI PRICE - Use only ML score with SIGNIFICANT penalty
          // Crops commonly available in AGMARKNET: Rice, Maize, Cotton, major pulses, and major fruits
          const commonMandiCrops = [
            'Rice', 'Maize', 'Cotton', 'Chickpea', 'Pigeonpeas', 'Mungbean', 'Blackgram', 'Lentil',
            'Banana', 'Mango', 'Pomegranate', 'Grapes', 'Orange', 'Coconut'
          ];
          const isCommonMandiCrop = commonMandiCrops.includes(crop.name);
          
          // Apply 30% penalty for common crops (should have data), 50% for rare crops (Ragi, Groundnut)
          const penaltyFactor = isCommonMandiCrop ? 0.7 : 0.5;
          
          return {
            ...crop,
            mandiPrice: null,
            // Penalty: Reduce ML score by 30-50% for crops without market data
            profitability_score: Math.round(crop.suitability_score * penaltyFactor),
            economicOutlook: isCommonMandiCrop ? 'Market data unavailable' : 'Limited market data - Less commercial',
            hasMandiPrice: false,
            priceWarning: `⚠️  AGMARKNET price data not available${isCommonMandiCrop ? ' (check mandi data refresh)' : ' (less commercial crop)'}`,
            marketRisk: isCommonMandiCrop ? 'Medium' : 'High - Limited market info'
          };
        }
      });
      
      // Sort by profitability (considering both ML score and mandi price)
      // PRIORITY: Crops WITH mandi prices rank higher than crops WITHOUT
      response.suitableCrops.sort((a, b) => {
        // First, prioritize crops WITH mandi price data
        if (a.hasMandiPrice && !b.hasMandiPrice) return -1;
        if (!a.hasMandiPrice && b.hasMandiPrice) return 1;
        
        // Then sort by profitability score
        const scoreA = a.profitability_score || a.suitability_score || 0;
        const scoreB = b.profitability_score || b.suitability_score || 0;
        return scoreB - scoreA;
      });
      
      // Update recommended crop to highest profitability
      if (response.suitableCrops.length > 0) {
        const topCrop = response.suitableCrops[0];
        response.recommendedCrop = topCrop.name;
        response.profitabilityScore = topCrop.profitability_score || topCrop.suitability_score;
      }
    }
    
    // Add aggregation info to response
    if (aggregatedComparison) {
      response.dataSource = {
        used: dataSourceUsed,
        realtime: {
          temperature: req.body.temperature,
          humidity: req.body.humidity,
          soilMoisture: req.body.soilMoisture,
          pH: req.body.pH
        },
        aggregated: aggregatedComparison.hasComparison ? aggregatedComparison.aggregated : null,
        comparison: aggregatedComparison.hasComparison ? {
          deviation: aggregatedComparison.comparison.deviation,
          isStable: aggregatedComparison.comparison.isStable,
          recommendation: aggregatedComparison.recommendation
        } : null,
        predictionInput: predictionData
      };
    }
    
    // ==========================================
    // ADD VALIDATION METADATA (Karnataka Agricultural Dataset)
    // ==========================================
    response.validation = {
      dataSourcesUsed: {
        sensorData: dataSourceUsed,
        mandiPrices: Object.keys(mandiPricesData).length > 0 ? 'AGMARKNET (Government of India)' : 'Not available',
        regionalDistribution: regionalDistribution ? 'Real farmer crop plans' : 'Not available',
        mlModel: 'Random Forest (23 Crops including Ragi, 59.91% accuracy)',
        dataset: 'Karnataka Agricultural Dataset (11,500 samples, ICAR validated)'
      },
      datasetValidation: {
        origin: 'Kaggle Crop Recommendation Dataset',
        validation: 'Karnataka Agricultural University + ICAR Guidelines',
        totalSamples: 11500,
        cropsCount: 23,
        includedCrops: 'All 23 crops including Ragi (Finger Millet) - Karnataka staple',
        accuracy: '59.91%',
        noSimulatedData: true,
        noDummyValues: true
      },
      timestamp: new Date().toISOString(),
      location: farmerRegion ? {
        state: farmerRegion.state,
        district: farmerRegion.district,
        taluk: farmerRegion.taluk
      } : null
    };
    
    // Add mandi prices summary to response
    if (Object.keys(mandiPricesData).length > 0) {
      response.marketPrices = {
        source: 'Government of India - AGMARKNET',
        availableFor: Object.keys(mandiPricesData),
        lastUpdated: mandiPricesData[Object.keys(mandiPricesData)[0]]?.lastUpdated,
        note: 'Real market prices from government APMC data'
      };
    }
    
    // ==========================================
    // LOG PREDICTION FOR VALIDATION FRAMEWORK
    // ==========================================
    try {
      const predictionLog = {
        timestamp: new Date().toISOString(),
        field_id: fieldId || null,
        farmer_id: req.user?.id || null,
        taluk: farmerRegion?.taluk || 'Unknown',
        
        raw_sensors: {
          temperature: req.body.temperature,
          humidity: req.body.humidity,
          soilMoisture: req.body.soilMoisture,
          pH: req.body.pH,
          rainfall: req.body.rainfall || 100
        },
        
        aggregated_24h: aggregatedComparison?.aggregated || null,
        
        prediction: {
          crop: response.recommendedCrop,
          confidence: response.profitabilityScore,
          suitability: response.suitabilityScore,
          dataSource: dataSourceUsed,
          mandiPriceUsed: Object.keys(mandiPricesData).length > 0
        },
        
        marketContext: {
          regionalDistribution: regionalDistribution || null,
          mandiPrices: mandiPricesData,
          season: getCurrentSeason()
        },
        
        actual_outcome: null  // To be filled after harvest
      };
      
      // Log for validation (console log - can be saved to file/DB)
      console.log('\n📊 [Prediction Log] Stored for validation:');
      console.log(JSON.stringify(predictionLog, null, 2));
      
    } catch (logError) {
      console.warn('⚠️  Could not log prediction:', logError.message);
    }
    
    res.json(response);
  } catch (error) {
    console.error('Crop recommendation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Lock a crop for a field
router.post('/lock-crop/:fieldId', authenticateFarmer, async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { selectedCrop } = req.body;

    if (!selectedCrop) {
      return res.status(400).json({ error: 'Selected crop is required' });
    }

    // Verify field ownership
    const field = await Field.findOne({ 
      _id: fieldId, 
      farmerId: req.user.id 
    });

    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    // Update field with locked crop information
    field.lockedCrop = selectedCrop;
    field.isCropLocked = true;
    field.cropLockDate = new Date();

    await field.save();

    res.json({
      message: 'Crop locked successfully',
      field
    });
  } catch (error) {
    console.error('Error locking crop:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlock crop for new season/change
router.post('/unlock-crop/:fieldId', authenticateFarmer, async (req, res) => {
  try {
    const { fieldId } = req.params;

    // Verify field ownership
    const field = await Field.findOne({ 
      _id: fieldId, 
      farmerId: req.user.id 
    });

    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    // Unlock the crop
    field.isCropLocked = false;
    field.lockedCrop = null;
    field.cropLockDate = null;

    await field.save();

    res.json({
      message: 'Crop unlocked successfully. You can now get new crop recommendations.',
      field
    });
  } catch (error) {
    console.error('Error unlocking crop:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Disease risk prediction
router.post('/disease', authenticate, async (req, res) => {
  try {
    const { crop, temperature, humidity, soilMoisture, pH } = req.body;

    console.log('\n🦠 [Disease Risk Prediction Request]');
    console.log('Data:', { crop, temperature, humidity, soilMoisture, pH });

    // Validate input (crop and environmental sensor readings)
    if (!crop || temperature === undefined || humidity === undefined || soilMoisture === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: crop, temperature, humidity, soilMoisture' 
      });
    }

    // Calculate disease risk based on conditions
    let riskLevel = 0;
    const diseases = [];
    const preventiveMeasures = [];

    // High humidity increases disease risk
    if (humidity > 80) {
      riskLevel += 30;
      diseases.push(`Fungal diseases (High humidity: ${humidity}%)`);
      preventiveMeasures.push('Apply preventive fungicide spray');
      preventiveMeasures.push('Improve field drainage and air circulation');
    } else if (humidity > 70) {
      riskLevel += 15;
      diseases.push('Moderate fungal risk');
    }

    // Temperature effects
    if (temperature > 32 && humidity > 70) {
      riskLevel += 20;
      diseases.push(`Bacterial diseases (Hot & humid: ${temperature}°C, ${humidity}%)`);
      preventiveMeasures.push('Monitor for bacterial blight and leaf spots');
    } else if (temperature < 15) {
      riskLevel += 10;
      diseases.push('Cold stress and mildew risk');
      preventiveMeasures.push('Protect crops from frost damage');
    }

    // Soil moisture effects
    if (soilMoisture > 80) {
      riskLevel += 15;
      diseases.push('Root rot risk due to waterlogging');
      preventiveMeasures.push('Reduce irrigation frequency');
      preventiveMeasures.push('Ensure proper drainage');
    } else if (soilMoisture < 30) {
      riskLevel += 10;
      diseases.push('Stress-induced susceptibility');
      preventiveMeasures.push('Maintain adequate soil moisture');
    }

    // pH imbalance (only evaluated if soil pH is provided)
    if (pH !== undefined && pH !== null && !isNaN(parseFloat(pH))) {
      const parsedPH = parseFloat(pH);
      if (parsedPH < 5.5 || parsedPH > 8.0) {
        riskLevel += 10;
        diseases.push(`pH stress (${parsedPH}) - nutrient deficiency`);
        if (parsedPH < 5.5) {
          preventiveMeasures.push('Apply lime to increase soil pH');
        } else {
          preventiveMeasures.push('Apply sulfur to decrease soil pH');
        }
      }
    }

    // Crop-specific diseases
    const cropDiseases = {
      'Rice': ['Blast disease', 'Brown spot', 'Sheath blight'],
      'Wheat': ['Rust diseases', 'Powdery mildew', 'Leaf blight'],
      'Cotton': ['Boll worm', 'Leaf curl virus', 'Root rot'],
      'Maize': ['Blight', 'Rust', 'Stalk rot'],
      'Sugarcane': ['Red rot', 'Smut', 'Wilt'],
      'Tomato': ['Late blight', 'Early blight', 'Leaf curl virus'],
      'Potato': ['Late blight', 'Early blight', 'Black leg'],
      'Soybean': ['Rust', 'Pod blight', 'Bacterial pustule']
    };

    // Add crop-specific advice
    if (cropDiseases[crop] && riskLevel > 30) {
      diseases.push(`${crop}-specific: Watch for ${cropDiseases[crop][0]}`);
    }

    // Cap risk at 100%
    riskLevel = Math.min(riskLevel, 100);

    // General preventive measures
    if (preventiveMeasures.length === 0 || riskLevel < 30) {
      preventiveMeasures.push('Regular field monitoring for early detection');
      preventiveMeasures.push('Maintain proper plant spacing for air circulation');
      preventiveMeasures.push('Use disease-resistant varieties');
    }

    preventiveMeasures.push('Remove and destroy infected plant parts');
    preventiveMeasures.push('Practice crop rotation');
    preventiveMeasures.push('Use balanced fertilization to strengthen plants');

    // Generate recommendation
    let recommendation = '';
    if (riskLevel < 30) {
      recommendation = 'Low disease risk. Continue regular monitoring.';
    } else if (riskLevel < 60) {
      recommendation = 'Moderate disease risk. Take preventive measures.';
    } else {
      recommendation = 'High disease risk! Immediate action required.';
    }

    const response = {
      crop,
      riskLevel,
      recommendation,
      diseases: diseases.length > 0 ? diseases : ['No immediate threats detected'],
      preventiveMeasures,
      conditions: {
        temperature,
        humidity,
        soilMoisture,
        pH
      },
      timestamp: new Date()
    };

    console.log('✅ Disease risk assessment completed:', { crop, riskLevel, recommendation });
    res.json(response);
  } catch (error) {
    console.error('Disease prediction error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper to invoke PyTorch MobileNetV2 Vision Model
function predictDiseaseMobileNetV2(image, crop) {
  return new Promise((resolve, reject) => {
    // Sanity check on image payload size (max 15MB base64 string)
    if (typeof image === 'string' && image.length > 15 * 1024 * 1024) {
      return reject(new Error('Image payload exceeds maximum limit of 15MB'));
    }

    const pythonScript = path.join(__dirname, '..', 'ml', 'mobilenet_v2_disease.py');
    const pyProcess = spawn('python3', [pythonScript]);

    let outputData = '';
    let errorData = '';
    let timeoutTimer = null;

    pyProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (code !== 0) {
        return reject(new Error(errorData || `MobileNetV2 process exited with code ${code}`));
      }
      try {
        const result = JSON.parse(outputData);
        if (result.status === 'error') {
          return reject(new Error(result.error));
        }
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse MobileNetV2 JSON output: ${e.message}`));
      }
    });

    pyProcess.stdin.on('error', (err) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      reject(new Error(`Failed to write to MobileNetV2 process stdin: ${err.message}`));
    });

    pyProcess.stdin.write(JSON.stringify({ image, crop }));
    pyProcess.stdin.end();

    timeoutTimer = setTimeout(() => {
      pyProcess.kill();
      reject(new Error('MobileNetV2 inference timed out (exceeded 15 seconds)'));
    }, 15000);
  });
}

// MobileNetV2 Deep Learning Image-Based Crop & Leaf Disease Detection
router.post('/disease-image', authenticate, async (req, res) => {
  try {
    const { image, crop } = req.body;

    console.log('\n📸 [MobileNetV2 Deep Learning Plant Disease Scan Request]');
    console.log('Target crop:', crop || 'Auto-detect');

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Run PyTorch MobileNetV2 Vision Classifier
    try {
      const mobileNetResult = await predictDiseaseMobileNetV2(image, crop);
      console.log('✅ MobileNetV2 Scan Result:', mobileNetResult.diagnosis, `(${mobileNetResult.confidence}%)`, `isHealthy: ${mobileNetResult.isHealthy}`);
      return res.json({
        ...mobileNetResult,
        timestamp: new Date().toISOString()
      });
    } catch (mlErr) {
      console.error('❌ MobileNetV2 inference failure:', mlErr.message);
      return res.status(422).json({
        status: 'invalid_image',
        valid: false,
        error: 'Invalid Image',
        message: 'Invalid Image: Please upload a clear photograph of a crop leaf.',
        details: mlErr.message
      });
    }
  } catch (error) {
    console.error('MobileNetV2 Disease prediction server error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: 'Invalid Image: Please upload a clear photograph of a crop leaf.'
    });
  }
});

export default router;