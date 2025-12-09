import express from 'express';
import SensorData from '../models/SensorData.js';
import Field from '../models/Field.js';
import CropPlan from '../models/CropPlan.js';
import { authenticate, authenticateFarmer } from '../middleware/auth.js';
import fetch from 'node-fetch';
import { predictCrop } from '../ml/ml_predictor.js';

const router = express.Router();
const ML_API_URL = 'http://localhost:5002/predict';

// Crop recommendation using TRAINED ML MODEL (Random Forest) with Market-Aware Diversification
router.post('/crop', authenticate, async (req, res) => {
  try {
    const { temperature, humidity, soilMoisture, pH, rainfall = 100, fieldId } = req.body;

    console.log('\n🌾 [Crop Recommendation Request - MARKET-AWARE ML MODEL]');
    console.log('Data:', { temperature, humidity, soilMoisture, pH, rainfall, fieldId });

    // Validate input
    if (!temperature || !humidity || !soilMoisture || !pH) {
      return res.status(400).json({ 
        error: 'Missing required fields: temperature, humidity, soilMoisture, pH' 
      });
    }

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
    // FETCH REGIONAL CROP DISTRIBUTION DATA
    // ==========================================
    let regionalDistribution = null;
    let farmerRegion = null;
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
    // CALL ML MODEL FOR PREDICTION
    // ==========================================
    let prediction;
    try {
      console.log('🤖 Calling Market-Aware ML Model...');
      prediction = await predictCrop(
        temperature, 
        humidity, 
        soilMoisture, 
        pH, 
        rainfall,
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

    // Validate input
    if (!crop || !temperature || !humidity || !soilMoisture || !pH) {
      return res.status(400).json({ 
        error: 'Missing required fields: crop, temperature, humidity, soilMoisture, pH' 
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

    // pH imbalance
    if (pH < 5.5 || pH > 8.0) {
      riskLevel += 10;
      diseases.push(`pH stress (${pH}) - nutrient deficiency`);
      if (pH < 5.5) {
        preventiveMeasures.push('Apply lime to increase soil pH');
      } else {
        preventiveMeasures.push('Apply sulfur to decrease soil pH');
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

export default router;