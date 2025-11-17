import express from 'express';
import MandiPrice from '../models/MandiPrice.js';
import PriceAlert from '../models/PriceAlert.js';
import { authenticate, authenticateFarmer } from '../middleware/auth.js';
import { createNotification } from '../utils/notificationService.js';
import { getDistance } from 'geolib';

const router = express.Router();

// Get mandi price trends for a crop
router.get('/trends/:crop', authenticate, async (req, res) => {
  try {
    const { crop } = req.params;
    const { days = 30, location } = req.query;

    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const query = {
      crop: crop,
      date: { $gte: daysAgo }
    };
    
    if (location) {
      query.location = location;
    }

    const prices = await MandiPrice.find(query)
      .sort({ date: 1 })
      .limit(100);

    // Calculate statistics
    const priceValues = prices.map(p => p.price);
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length || 0;
    const maxPrice = Math.max(...priceValues, 0);
    const minPrice = Math.min(...priceValues.filter(p => p > 0), 0);
    
    // Calculate trend (simple linear regression)
    const trend = calculateTrend(prices);
    
    // Predict best selling day
    const prediction = predictBestSellingDay(prices, trend);

    res.json({
      crop,
      location: location || 'All',
      days: parseInt(days),
      prices,
      statistics: {
        current: priceValues[priceValues.length - 1] || 0,
        average: Math.round(avgPrice),
        highest: maxPrice,
        lowest: minPrice,
        trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        trendPercentage: Math.round(trend * 100)
      },
      prediction
    });
  } catch (error) {
    console.error('Error fetching mandi prices:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get nearby mandi locations
router.get('/locations', authenticate, async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;
    
    // Get distinct locations (in real app, calculate distance)
    const locations = await MandiPrice.distinct('location');
    
    res.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add mandi price (for testing/admin)
router.post('/add', async (req, res) => {
  try {
    const { crop, location, price, minPrice, maxPrice } = req.body;
    
    const mandiPrice = new MandiPrice({
      crop,
      location,
      price,
      minPrice,
      maxPrice,
      date: new Date()
    });

    await mandiPrice.save();

    res.status(201).json({
      message: 'Mandi price added',
      data: mandiPrice
    });
  } catch (error) {
    console.error('Error adding mandi price:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to calculate price trend
function calculateTrend(prices) {
  if (prices.length < 2) return 0;
  
  const recentPrices = prices.slice(-7); // Last 7 days
  const oldPrices = prices.slice(0, 7); // First 7 days
  
  const recentAvg = recentPrices.reduce((a, b) => a + b.price, 0) / recentPrices.length;
  const oldAvg = oldPrices.reduce((a, b) => a + b.price, 0) / oldPrices.length;
  
  return ((recentAvg - oldAvg) / oldAvg);
}

// Helper function to predict best selling day
function predictBestSellingDay(prices, trend) {
  if (prices.length === 0) {
    return {
      recommendation: 'Insufficient data',
      bestDay: null,
      confidence: 0
    };
  }

  const currentPrice = prices[prices.length - 1].price;
  
  // Analyze day-of-week patterns
  const dayPatterns = {};
  prices.forEach(p => {
    const day = new Date(p.date).toLocaleDateString('en-US', { weekday: 'long' });
    if (!dayPatterns[day]) {
      dayPatterns[day] = [];
    }
    dayPatterns[day].push(p.price);
  });

  // Find day with highest average price
  let bestDay = null;
  let highestAvg = 0;
  
  Object.keys(dayPatterns).forEach(day => {
    const avg = dayPatterns[day].reduce((a, b) => a + b, 0) / dayPatterns[day].length;
    if (avg > highestAvg) {
      highestAvg = avg;
      bestDay = day;
    }
  });

  // Generate recommendation
  let recommendation = '';
  let confidence = 0;

  if (trend > 0.05) {
    recommendation = 'Wait for 5-7 days - Prices are rising';
    confidence = 75;
  } else if (trend < -0.05) {
    recommendation = 'Sell immediately - Prices are falling';
    confidence = 80;
  } else {
    recommendation = `Best to sell on ${bestDay} - Historical high prices`;
    confidence = 65;
  }

  return {
    recommendation,
    bestDay,
    expectedPrice: Math.round(currentPrice * (1 + trend * 0.5)),
    confidence,
    currentPrice: Math.round(currentPrice),
    daysToWait: trend > 0.05 ? '5-7 days' : trend < -0.05 ? 'Now' : `Next ${bestDay}`
  };
}

// Get nearby mandis with prices
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { lat, lng, radius = 50, crop } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location required' });
    }
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    // Get all locations with their latest prices
    const locations = await MandiPrice.distinct('location');
    const mandiData = [];
    
    for (const location of locations) {
      // Mock location coordinates (in real app, store in database)
      const locationCoords = {
        'Bangalore APMC': { lat: 12.9716, lng: 77.5946 },
        'Yeshwantpur Mandi': { lat: 13.0280, lng: 77.5490 },
        'KR Market': { lat: 12.9634, lng: 77.5855 },
        'Chennai Koyambedu': { lat: 13.0698, lng: 80.1958 }
      };
      
      const coords = locationCoords[location] || { lat: latitude, lng: longitude };
      const distance = getDistance(
        { latitude, longitude },
        { latitude: coords.lat, longitude: coords.lng }
      ) / 1000;
      
      if (distance <= radius) {
        const query = { location };
        if (crop) query.crop = crop;
        
        const latestPrice = await MandiPrice.findOne(query)
          .sort({ date: -1 });
        
        if (latestPrice) {
          mandiData.push({
            name: location,
            location: coords,
            distance: Math.round(distance * 10) / 10,
            crop: latestPrice.crop,
            price: latestPrice.price,
            minPrice: latestPrice.minPrice,
            maxPrice: latestPrice.maxPrice,
            date: latestPrice.date
          });
        }
      }
    }
    
    // Sort by distance
    mandiData.sort((a, b) => a.distance - b.distance);
    
    res.json({
      mandis: mandiData,
      count: mandiData.length
    });
  } catch (error) {
    console.error('Error fetching nearby mandis:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get best price mandi
router.get('/best-price', authenticate, async (req, res) => {
  try {
    const { crop, lat, lng } = req.query;
    
    if (!crop) {
      return res.status(400).json({ error: 'Crop required' });
    }
    
    const allPrices = await MandiPrice.find({ crop })
      .sort({ date: -1, price: -1 })
      .limit(10);
    
    if (allPrices.length === 0) {
      return res.status(404).json({ error: 'No prices found' });
    }
    
    const bestPrice = allPrices[0];
    const avgPrice = allPrices.reduce((a, b) => a + b.price, 0) / allPrices.length;
    const priceDiff = bestPrice.price - avgPrice;
    
    res.json({
      bestMandi: {
        name: bestPrice.location,
        price: bestPrice.price,
        date: bestPrice.date
      },
      averagePrice: Math.round(avgPrice),
      priceDifference: Math.round(priceDiff),
      percentageHigher: Math.round((priceDiff / avgPrice) * 100),
      recommendation: priceDiff > avgPrice * 0.1 
        ? `Best price! ₹${Math.round(priceDiff)} more than average`
        : 'Price is near average'
    });
  } catch (error) {
    console.error('Error fetching best price:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set price alert
router.post('/price-alert', authenticateFarmer, async (req, res) => {
  try {
    const { crop, targetPrice } = req.body;
    
    const alert = new PriceAlert({
      userId: req.userId,
      crop,
      targetPrice
    });
    
    await alert.save();
    
    res.status(201).json({
      message: 'Price alert set',
      alert
    });
  } catch (error) {
    console.error('Error setting price alert:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's price alerts
router.get('/my-alerts', authenticateFarmer, async (req, res) => {
  try {
    const alerts = await PriceAlert.find({ userId: req.userId, isActive: true });
    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
