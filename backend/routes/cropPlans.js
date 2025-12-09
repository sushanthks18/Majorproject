import express from 'express';
import CropPlan from '../models/CropPlan.js';
import Field from '../models/Field.js';
import { authenticate, authenticateFarmer } from '../middleware/auth.js';

const router = express.Router();

// Create a crop plan (farmer selects crop to plant)
router.post('/', authenticateFarmer, async (req, res) => {
  try {
    const { fieldId, selectedCrop, season, expectedMarketPrice, expectedYield, profitabilityScore } = req.body;

    // Validate
    if (!fieldId || !selectedCrop || !season) {
      return res.status(400).json({ error: 'Field, crop, and season are required' });
    }

    // Get field details
    const field = await Field.findById(fieldId);
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    // Check ownership
    if (field.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if plan already exists for this field in this season
    const currentYear = new Date().getFullYear();
    const existingPlan = await CropPlan.findOne({
      farmerId: req.user.id,
      fieldId,
      year: currentYear,
      season,
      status: { $in: ['planned', 'sowing', 'growing'] }
    });

    if (existingPlan) {
      // Update existing plan
      existingPlan.selectedCrop = selectedCrop;
      existingPlan.expectedMarketPrice = expectedMarketPrice;
      existingPlan.expectedYield = expectedYield;
      existingPlan.profitabilityScore = profitabilityScore;
      existingPlan.updatedAt = new Date();
      await existingPlan.save();

      return res.json({
        message: 'Crop plan updated successfully',
        cropPlan: existingPlan
      });
    }

    // Create new crop plan
    const cropPlan = new CropPlan({
      farmerId: req.user.id,
      fieldId,
      selectedCrop,
      areaHectares: field.areaHectares,
      season,
      year: currentYear,
      region: {
        state: field.state,
        district: field.district,
        taluk: field.taluk
      },
      expectedMarketPrice,
      expectedYield,
      profitabilityScore,
      status: 'planned'
    });

    await cropPlan.save();

    res.status(201).json({
      message: 'Crop plan created successfully',
      cropPlan
    });
  } catch (error) {
    console.error('Crop plan creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get farmer's crop plans
router.get('/my-plans', authenticateFarmer, async (req, res) => {
  try {
    const { year, season, status } = req.query;
    
    const query = { farmerId: req.user.id };
    
    if (year) query.year = parseInt(year);
    if (season) query.season = season;
    if (status) query.status = status;

    const cropPlans = await CropPlan.find(query)
      .populate('fieldId', 'name areaHectares state district taluk')
      .sort({ createdAt: -1 });

    res.json({ cropPlans });
  } catch (error) {
    console.error('Fetch crop plans error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get regional crop distribution (for market insights)
router.get('/regional-distribution', authenticate, async (req, res) => {
  try {
    const { district, taluk, season, year } = req.query;

    if (!district) {
      return res.status(400).json({ error: 'District is required' });
    }

    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentSeason = season || 'year-round';

    const query = {
      'region.district': district,
      year: currentYear,
      season: { $in: [currentSeason, 'year-round'] },
      status: { $in: ['planned', 'sowing', 'growing'] }
    };

    if (taluk) {
      query['region.taluk'] = taluk;
    }

    const regionalPlans = await CropPlan.find(query);

    // Calculate distribution
    const cropDistribution = {};
    let totalArea = 0;
    let farmerCount = 0;

    regionalPlans.forEach(plan => {
      const crop = plan.selectedCrop;
      const area = plan.areaHectares || 0;
      
      if (!cropDistribution[crop]) {
        cropDistribution[crop] = { area: 0, farmers: 0 };
      }
      
      cropDistribution[crop].area += area;
      cropDistribution[crop].farmers += 1;
      totalArea += area;
      farmerCount += 1;
    });

    // Calculate percentages and warnings
    const distribution = Object.keys(cropDistribution).map(crop => {
      const data = cropDistribution[crop];
      const percentage = totalArea > 0 ? (data.area / totalArea) * 100 : 0;
      
      let warning = null;
      if (percentage > 40) {
        warning = 'Severe oversupply risk - Consider alternatives';
      } else if (percentage > 30) {
        warning = 'High oversupply risk - Price may drop';
      } else if (percentage > 20) {
        warning = 'Moderate supply - Diversification recommended';
      }

      return {
        crop,
        area: data.area,
        farmers: data.farmers,
        percentage: parseFloat(percentage.toFixed(2)),
        warning
      };
    }).sort((a, b) => b.percentage - a.percentage);

    res.json({
      region: { district, taluk },
      season: currentSeason,
      year: currentYear,
      totalArea,
      farmerCount,
      distribution,
      diversificationNeeded: distribution.some(d => d.percentage > 25)
    });
  } catch (error) {
    console.error('Regional distribution error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update crop plan status
router.patch('/:planId/status', authenticateFarmer, async (req, res) => {
  try {
    const { planId } = req.params;
    const { status } = req.body;

    if (!['planned', 'sowing', 'growing', 'harvested', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const cropPlan = await CropPlan.findById(planId);
    
    if (!cropPlan) {
      return res.status(404).json({ error: 'Crop plan not found' });
    }

    if (cropPlan.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    cropPlan.status = status;
    cropPlan.updatedAt = new Date();
    await cropPlan.save();

    res.json({
      message: 'Crop plan status updated',
      cropPlan
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete crop plan
router.delete('/:planId', authenticateFarmer, async (req, res) => {
  try {
    const { planId } = req.params;

    const cropPlan = await CropPlan.findById(planId);
    
    if (!cropPlan) {
      return res.status(404).json({ error: 'Crop plan not found' });
    }

    if (cropPlan.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await cropPlan.deleteOne();

    res.json({ message: 'Crop plan deleted successfully' });
  } catch (error) {
    console.error('Delete crop plan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// 🆕 NEW FEATURE: Crop Frequency Insight
// ==========================================
// Get crop frequency statistics across all farmers
router.get('/crop-frequency/:cropName', authenticate, async (req, res) => {
  try {
    const { cropName } = req.params;
    const { district, taluk } = req.query;

    console.log(`\n📊 [Crop Frequency Insight] Analyzing: ${cropName}`);

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

    // Build query - get all active crop plans for current season/year
    const baseQuery = {
      year: currentYear,
      season: { $in: [currentSeason, 'year-round'] },
      status: { $in: ['planned', 'sowing', 'growing'] }
    };

    // Add regional filters if provided
    if (district) {
      baseQuery['region.district'] = district;
    }
    if (taluk) {
      baseQuery['region.taluk'] = taluk;
    }

    // Get all crop plans in the region
    const allCropPlans = await CropPlan.find(baseQuery);
    const totalFarmers = new Set(allCropPlans.map(plan => plan.farmerId.toString())).size;

    // Get farmers planning to grow this specific crop
    const sameCropQuery = { ...baseQuery, selectedCrop: cropName };
    const sameCropPlans = await CropPlan.find(sameCropQuery);
    const farmersWithSameCrop = new Set(sameCropPlans.map(plan => plan.farmerId.toString())).size;

    // Calculate percentage
    const frequencyPercentage = totalFarmers > 0 
      ? parseFloat(((farmersWithSameCrop / totalFarmers) * 100).toFixed(2))
      : 0;

    // Determine trend description and risk level
    // IMPORTANT: Only show high risk when there's meaningful competition (multiple farmers)
    let trendDescription = '';
    let riskLevel = 'low';  // low, medium, high
    let insight = '';
    let recommendation = '';
    let colorCode = 'green';  // green, yellow, red

    // If there are very few farmers total (< 5), there's no real competition yet
    if (totalFarmers < 5) {
      trendDescription = 'Low Competition';
      riskLevel = 'low';
      insight = '✅ Low competition — good market opportunity!';
      recommendation = 'Limited farmers in the region currently. Good time to establish your crop.';
      colorCode = 'green';
    }
    // Very High Risk: ≥50% of farmers growing same crop AND at least 5 total farmers
    else if (frequencyPercentage >= 50 && totalFarmers >= 5) {
      trendDescription = 'Very High Competition';
      riskLevel = 'high';
      insight = '⚠️ High demand crop — many farmers are planning to grow this.';
      recommendation = 'Risk of market oversupply — consider diversification to other crops for better market opportunity.';
      colorCode = 'red';
    }
    // High Risk: 35-49% of farmers
    else if (frequencyPercentage >= 35) {
      trendDescription = 'High Competition';
      riskLevel = 'high';
      insight = '⚠️ Popular crop in your region — significant competition expected.';
      recommendation = 'Moderate oversupply risk — monitor market prices and consider alternative crops.';
      colorCode = 'orange';
    }
    // Medium Risk: 25-34% of farmers
    else if (frequencyPercentage >= 25) {
      trendDescription = 'Moderate Competition';
      riskLevel = 'medium';
      insight = '📊 Moderately popular crop — balanced supply expected.';
      recommendation = 'Healthy competition level — proceed with standard market monitoring.';
      colorCode = 'yellow';
    }
    // Low Risk: <25% of farmers
    else {
      trendDescription = 'Low Competition';
      riskLevel = 'low';
      insight = '🌟 Low competition — good market opportunity!';
      recommendation = 'Favorable market conditions — limited regional supply may lead to better prices.';
      colorCode = 'green';
    }

    // Calculate total area being used for this crop
    const totalAreaForCrop = sameCropPlans.reduce((sum, plan) => sum + (plan.areaHectares || 0), 0);
    const totalAreaAll = allCropPlans.reduce((sum, plan) => sum + (plan.areaHectares || 0), 0);
    const areaPercentage = totalAreaAll > 0 
      ? parseFloat(((totalAreaForCrop / totalAreaAll) * 100).toFixed(2))
      : 0;

    // Get top competing crops in the region
    const cropCounts = {};
    allCropPlans.forEach(plan => {
      cropCounts[plan.selectedCrop] = (cropCounts[plan.selectedCrop] || 0) + 1;
    });

    const topCrops = Object.entries(cropCounts)
      .map(([crop, count]) => ({
        crop,
        farmers: count,
        percentage: parseFloat(((count / totalFarmers) * 100).toFixed(2))
      }))
      .sort((a, b) => b.farmers - a.farmers)
      .slice(0, 5);

    const response = {
      cropName,
      region: {
        district: district || 'All districts',
        taluk: taluk || 'All taluks'
      },
      season: currentSeason,
      year: currentYear,
      statistics: {
        totalFarmers,
        farmersWithSameCrop,
        frequencyPercentage,
        totalAreaForCrop: parseFloat(totalAreaForCrop.toFixed(2)),
        areaPercentage
      },
      insight: {
        trendDescription,
        riskLevel,
        insight,
        recommendation,
        colorCode
      },
      topCompetingCrops: topCrops,
      timestamp: new Date()
    };

    console.log('✅ Crop frequency analysis completed:', {
      crop: cropName,
      farmers: farmersWithSameCrop,
      total: totalFarmers,
      percentage: frequencyPercentage + '%',
      risk: riskLevel
    });

    res.json(response);
  } catch (error) {
    console.error('Crop frequency insight error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;
