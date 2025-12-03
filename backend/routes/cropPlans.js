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

export default router;
