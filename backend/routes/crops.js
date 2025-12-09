import express from 'express';
import CropPrediction from '../models/CropPrediction.js';

const router = express.Router();

// ==========================================
// POST /api/crops/savePrediction
// Save a farmer's crop prediction
// ==========================================
router.post('/savePrediction', async (req, res) => {
  try {
    const { farmerId, predictedCrop, area, region, season } = req.body;

    console.log('\n🌾 [Save Crop Prediction]');
    console.log('Data:', { farmerId, predictedCrop, area, region, season });

    // Validate required fields
    if (!farmerId || !predictedCrop || !area) {
      return res.status(400).json({ 
        error: 'Missing required fields: farmerId, predictedCrop, and area are required' 
      });
    }

    // Create new crop prediction
    const cropPrediction = new CropPrediction({
      farmerId,
      predictedCrop,
      area: parseFloat(area),
      region: region || 'Tumkur',
      season: season || 'Rabi 2025',
      timestamp: new Date()
    });

    await cropPrediction.save();

    console.log('✅ Crop prediction saved successfully:', cropPrediction._id);

    res.status(201).json({
      success: true,
      message: 'Crop prediction saved successfully',
      data: {
        id: cropPrediction._id,
        farmerId: cropPrediction.farmerId,
        predictedCrop: cropPrediction.predictedCrop,
        area: cropPrediction.area,
        region: cropPrediction.region,
        season: cropPrediction.season,
        timestamp: cropPrediction.timestamp
      }
    });

  } catch (error) {
    console.error('❌ Error saving crop prediction:', error);
    res.status(500).json({ 
      error: 'Failed to save crop prediction',
      details: error.message 
    });
  }
});

// ==========================================
// GET /api/crops/frequency
// Get crop frequency statistics for a region + season + crop
// ==========================================
router.get('/frequency', async (req, res) => {
  try {
    const { region, season, crop } = req.query;

    console.log('\n📊 [Crop Frequency Analysis]');
    console.log('Query:', { region, season, crop });

    // Validate required query parameters
    if (!region || !season || !crop) {
      return res.status(400).json({ 
        error: 'Missing required query parameters: region, season, and crop are required' 
      });
    }

    // Build base query for region + season
    const baseQuery = {
      region: region,
      season: season
    };

    // Get all crop predictions for this region + season
    const allPredictions = await CropPrediction.find(baseQuery);

    // Count total unique farmers
    const totalFarmers = new Set(allPredictions.map(p => p.farmerId)).size;

    // Get predictions for this specific crop
    const sameCropPredictions = await CropPrediction.find({
      ...baseQuery,
      predictedCrop: crop
    });

    // Count farmers growing this specific crop
    const farmersWithSameCrop = new Set(sameCropPredictions.map(p => p.farmerId)).size;

    // Calculate frequency percentage
    const frequencyPercent = totalFarmers > 0 
      ? parseFloat(((farmersWithSameCrop / totalFarmers) * 100).toFixed(2))
      : 0;

    // Calculate total area for all crops
    const totalArea = allPredictions.reduce((sum, p) => sum + (p.area || 0), 0);

    // Calculate area for this specific crop
    const cropArea = sameCropPredictions.reduce((sum, p) => sum + (p.area || 0), 0);

    // Calculate area share percentage
    const areaSharePercent = totalArea > 0 
      ? parseFloat(((cropArea / totalArea) * 100).toFixed(2))
      : 0;

    // Determine competition level based on frequency AND actual farmer count
    // IMPORTANT: Only show high risk when there's meaningful competition (multiple farmers)
    let competitionLevel = '';
    let message = '';

    // If there are very few farmers total (< 5), there's no real competition yet
    if (totalFarmers < 5) {
      competitionLevel = 'Low Competition';
      message = '✅ Low competition — good market opportunity. Limited farmers in the region currently.';
    }
    // High risk: ≥50% of farmers growing same crop AND at least 5 total farmers
    else if (frequencyPercent >= 50 && totalFarmers >= 5) {
      competitionLevel = 'Very High Competition';
      message = '⚠️ High demand crop — many farmers are planning to grow this. Risk of market oversupply — consider diversification.';
    }
    // Medium risk: 25-49% of farmers growing same crop
    else if (frequencyPercent >= 25) {
      competitionLevel = 'Medium Competition';
      message = '📊 Moderately popular crop — balanced supply expected. Monitor market conditions.';
    }
    // Low risk: <25% of farmers
    else {
      competitionLevel = 'Low Competition';
      message = '✅ Low competition — good market opportunity. Limited regional supply may lead to better prices.';
    }

    const response = {
      region,
      season,
      crop,
      totalFarmers,
      farmersWithSameCrop,
      frequencyPercent,
      totalArea: parseFloat(totalArea.toFixed(2)),
      cropArea: parseFloat(cropArea.toFixed(2)),
      areaSharePercent,
      competitionLevel,
      message
    };

    console.log('✅ Frequency analysis completed:', {
      crop,
      farmers: farmersWithSameCrop,
      total: totalFarmers,
      frequency: frequencyPercent + '%',
      competition: competitionLevel
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Error calculating crop frequency:', error);
    res.status(500).json({ 
      error: 'Failed to calculate crop frequency',
      details: error.message 
    });
  }
});

// ==========================================
// GET /api/crops/all
// Get all crop predictions for debugging/testing
// ==========================================
router.get('/all', async (req, res) => {
  try {
    const { region, season } = req.query;
    
    const query = {};
    if (region) query.region = region;
    if (season) query.season = season;

    const predictions = await CropPrediction.find(query)
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({
      count: predictions.length,
      data: predictions
    });

  } catch (error) {
    console.error('❌ Error fetching crop predictions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch crop predictions',
      details: error.message 
    });
  }
});

export default router;
