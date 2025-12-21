import express from 'express';
import MandiPrice from '../models/MandiPrice.js';
import PriceAlert from '../models/PriceAlert.js';
import { authenticate, authenticateFarmer } from '../middleware/auth.js';
import { createNotification } from '../utils/notificationService.js';
import { getDistance } from 'geolib';
import fetch from 'node-fetch';

const router = express.Router();

// Government API endpoint for mandi prices
const AGMARKNET_API = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const API_KEY = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

// Rate limiting: Track last API call time
let lastAPICall = 0;
const MIN_API_INTERVAL = 5000; // 5 seconds between API calls

// Crop name mapping (frontend to API) - ALL 23 crops from ML model (including Ragi)
const CROP_MAPPING = {
  // Cereals
  'Rice': 'Rice',
  'Maize': 'Maize',
  'Ragi': 'Ragi',  // Finger Millet - Karnataka's staple crop
  // Pulses
  'Chickpea': 'Gram',
  'Kidneybeans': 'Rajma',
  'Pigeonpeas': 'Tur(Arhar)',
  'Mothbeans': 'Moth',
  'Mungbean': 'Moong(Green Gram)',
  'Blackgram': 'Urad',
  'Lentil': 'Masur',
  // Fruits
  'Pomegranate': 'Pomegranate',
  'Banana': 'Banana',
  'Mango': 'Mango',
  'Grapes': 'Grapes',
  'Watermelon': 'Water Melon',
  'Muskmelon': 'Musk Melon',
  'Apple': 'Apple',
  'Orange': 'Orange',
  'Papaya': 'Papaya',
  'Coconut': 'Coconut',
  // Cash Crops
  'Cotton': 'Cotton',
  'Jute': 'Jute',
  'Coffee': 'Coffee',
  // Legacy (kept for compatibility)
  'Wheat': 'Wheat',
  'Sugarcane': 'Sugarcane',
  'Tomato': 'Tomato',
  'Potato': 'Potato',
  'Onion': 'Onion',
  'Soybean': 'Soya bean'
};

// Market/State mapping
const MARKET_MAPPING = {
  'Bangalore APMC': { state: 'Karnataka', district: 'Bangalore' },
  'Yeshwantpur Mandi': { state: 'Karnataka', district: 'Bangalore' },
  'KR Market': { state: 'Karnataka', district: 'Bangalore' },
  'Mysore APMC': { state: 'Karnataka', district: 'Mysore' },
  'Hubli APMC': { state: 'Karnataka', district: 'Dharwad' },
  'Dharwad Mandi': { state: 'Karnataka', district: 'Dharwad' }
};

/**
 * Fetch real mandi prices from Government of India API
 * Data source: AGMARKNET (Agricultural Marketing Department)
 */
async function fetchRealMandiPrices(crop, state = 'Karnataka', limit = 100) {
  try {
    // Rate limiting check
    const now = Date.now();
    const timeSinceLastCall = now - lastAPICall;
    if (timeSinceLastCall < MIN_API_INTERVAL) {
      const waitTime = MIN_API_INTERVAL - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before API call...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastAPICall = Date.now();

    const apiCrop = CROP_MAPPING[crop] || crop;
    
    // Build API URL with filters
    const params = new URLSearchParams({
      'api-key': API_KEY,
      'format': 'json',
      'limit': limit.toString(),
      'filters[state]': state,
      'filters[commodity]': apiCrop
    });

    const url = `${AGMARKNET_API}?${params.toString()}`;
    
    console.log(`🌾 Fetching real mandi data for ${crop} from Government API...`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Krishi-Sakha-Platform/1.0'
      },
      timeout: 15000
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log('⚠️ Rate limit hit, will use cached data');
        return null; // Gracefully return null to use cached data
      }
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.records || data.records.length === 0) {
      console.log(`⚠️  No real data found for ${crop}, will use cached data`);
      return null;
    }

    console.log(`✅ Fetched ${data.records.length} real price records for ${crop}`);
    
    // Transform API data to our format
    const prices = data.records.map(record => ({
      crop: crop,
      location: record.market || record.district || 'Unknown Market',
      price: parseFloat(record.modal_price) || 0,
      minPrice: parseFloat(record.min_price) || 0,
      maxPrice: parseFloat(record.max_price) || 0,
      date: record.arrival_date ? new Date(record.arrival_date) : new Date(),
      state: record.state,
      district: record.district,
      variety: record.variety || 'General',
      source: 'AGMARKNET'
    })).filter(p => p.price > 0); // Remove zero prices

    return prices;
  } catch (error) {
    console.error('❌ Error fetching real mandi prices:', error.message);
    // Return a specific error object to distinguish from "no data found"
    throw new Error(`Government API error: ${error.message}`);
  }
}

/**
 * Sync real mandi prices to database
 */
async function syncMandiPricesToDB(crop, location) {
  try {
    const marketInfo = MARKET_MAPPING[location] || { state: 'Karnataka', district: 'Bangalore' };
    console.log(`🔄 Syncing data for ${crop} in ${location} (${marketInfo.state})`);
    
    const realPrices = await fetchRealMandiPrices(crop, marketInfo.state);
    
    if (!realPrices || realPrices.length === 0) {
      console.log(`🔍 No new data available for ${crop} in ${location}`);
      return false;
    }

    // Save to database
    let savedCount = 0;
    let updatedCount = 0;
    
    for (const priceData of realPrices) {
      try {
        // Check if already exists
        const existing = await MandiPrice.findOne({
          crop: priceData.crop,
          location: priceData.location,
          date: priceData.date
        });

        if (existing) {
          // Update existing record if data has changed
          let updated = false;
          if (existing.price !== priceData.price) {
            existing.price = priceData.price;
            updated = true;
          }
          if (existing.minPrice !== priceData.minPrice) {
            existing.minPrice = priceData.minPrice;
            updated = true;
          }
          if (existing.maxPrice !== priceData.maxPrice) {
            existing.maxPrice = priceData.maxPrice;
            updated = true;
          }
          if (existing.source !== 'AGMARKNET') {
            existing.source = 'AGMARKNET';
            updated = true;
          }
          
          if (updated) {
            await existing.save();
            updatedCount++;
            console.log(`💾 Updated price record for ${priceData.crop} at ${priceData.location} on ${priceData.date}`);
          }
        } else {
          await MandiPrice.create(priceData);
          savedCount++;
          console.log(`💾 Saved new price record for ${priceData.crop} at ${priceData.location} on ${priceData.date}`);
        }
      } catch (saveError) {
        console.error(`❌ Error saving price data for ${priceData.crop}:`, saveError.message);
      }
    }

    console.log(`✅ Synced ${savedCount} new and ${updatedCount} updated price records to database`);
    return true;
  } catch (error) {
    console.error('❌ Error syncing to DB:', error.message);
    // Re-throw the error so the caller knows sync failed
    throw error;
  }
}

// Get mandi price trends for a crop
router.get('/trends/:crop', authenticate, async (req, res) => {
  try {
    const { crop } = req.params;
    const { days = 30, location } = req.query;

    console.log(`\n📊 [Mandi Trends] Request for ${crop} at ${location || 'All locations'}`);
    console.log(`📊 Location parameter type: ${typeof location}, value: "${location}"`);

    // Check if we have recent cached data (within last 24 hours)
    const recentDataQuery = {
      crop: crop,
      date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      source: 'AGMARKNET'
    };
    if (location) recentDataQuery.location = location;
    
    const recentCacheCount = await MandiPrice.countDocuments(recentDataQuery);
    
    // Only fetch from API if no recent cached data
    if (recentCacheCount === 0 && location) {
      console.log('🔄 No recent cache, attempting to fetch fresh data from Government API...');
      try {
        await syncMandiPricesToDB(crop, location);
      } catch (syncError) {
        console.log('⚠️  Failed to sync with Government API, using any available cached data:', syncError.message);
      }
    } else {
      console.log(`✅ Using ${recentCacheCount} recent cached records (< 24h old)`);
    }

    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const query = {
      crop: crop,
      date: { $gte: daysAgo }
    };
    
    if (location) {
      query.location = location;
    }

    let prices = await MandiPrice.find(query)
      .sort({ date: 1 })
      .limit(100);

    // If no data found in DB, try direct API fetch
    if (prices.length === 0) {
      console.log('📊 No cached data, fetching directly from API...');
      const marketInfo = location ? MARKET_MAPPING[location] : { state: 'Karnataka' };
      try {
        const realPrices = await fetchRealMandiPrices(crop, marketInfo?.state || 'Karnataka');
        
        if (realPrices && realPrices.length > 0) {
          // Save to DB for future use
          for (const priceData of realPrices) {
            try {
              // Check if record already exists for this crop/location/date combination
              const existing = await MandiPrice.findOne({
                crop: priceData.crop,
                location: priceData.location,
                date: priceData.date
              });
              
              if (existing) {
                // Update existing record
                existing.price = priceData.price;
                existing.minPrice = priceData.minPrice;
                existing.maxPrice = priceData.maxPrice;
                existing.source = 'AGMARKNET';
                await existing.save();
              } else {
                // Create new record
                await MandiPrice.create(priceData);
              }
            } catch (err) {
              console.error('Error saving price data:', err.message);
            }
          }
          prices = realPrices.filter(p => p.date >= daysAgo);
          console.log(`✅ Using ${prices.length} real-time prices from Government API`);
        }
      } catch (apiError) {
        console.log('⚠️  Government API error, continuing with any available cached data:', apiError.message);
      }
    } else {
      console.log(`✅ Found ${prices.length} cached price records`);
    }

    console.log(`📊 Found ${prices.length} records from database`);

    if (prices.length === 0) {
      return res.status(404).json({ 
        error: 'No price data available',
        message: `No data found for ${crop} in ${location || 'any location'}. Government API may not have recent data.`
      });
    }

    // Calculate statistics
    const priceValues = prices.map(p => p.price);
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length || 0;
    const maxPrice = Math.max(...priceValues, 0);
    const minPrice = Math.min(...priceValues.filter(p => p > 0), 0);
    
    // Calculate trend (simple linear regression)
    const trend = calculateTrend(prices);
    
    // Predict best selling day
    const prediction = predictBestSellingDay(prices, trend);

    // Add data source info
    const hasRealData = prices.some(p => p.source === 'AGMARKNET');

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
        trend: trend > 0 ? 'increasing' : trend < -0.05 ? 'decreasing' : 'stable',
        trendPercentage: Math.round(trend * 100)
      },
      prediction,
      dataSource: hasRealData ? 'Government of India - AGMARKNET' : 'Cached Data',
      lastUpdated: prices[prices.length - 1]?.date || new Date()
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

// Refresh mandi data from Government API (Manual sync)
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const { crop, location } = req.body;
    
    if (!crop) {
      return res.status(400).json({ error: 'Crop is required' });
    }

    console.log(`🔄 [Manual Refresh] User requested refresh for ${crop} at ${location || 'All locations'}`);
    
    // First check if we have existing cached data
    const existingQuery = { crop: crop };
    if (location) existingQuery.location = location;
    
    const existingCount = await MandiPrice.countDocuments(existingQuery);
    console.log(`📊 Found ${existingCount} existing records for ${crop} at ${location || 'all locations'}`);
    
    // Try to fetch from government API
    const marketInfo = location ? MARKET_MAPPING[location] : { state: 'Karnataka' };
    let apiSuccess = false;
    let fetchedCount = 0;
    
    try {
      console.log(`🌐 Attempting to fetch from Government API...`);
      const realPrices = await fetchRealMandiPrices(crop, marketInfo?.state || 'Karnataka', 200);
      
      if (realPrices && realPrices.length > 0) {
        console.log(`✅ Successfully fetched ${realPrices.length} records from Government API`);
        
        // Save to database
        let savedCount = 0;
        let updatedCount = 0;
        
        for (const priceData of realPrices) {
          try {
            const existing = await MandiPrice.findOne({
              crop: priceData.crop,
              location: priceData.location,
              date: priceData.date
            });

            if (existing) {
              let updated = false;
              if (existing.price !== priceData.price) {
                existing.price = priceData.price;
                updated = true;
              }
              if (existing.minPrice !== priceData.minPrice) {
                existing.minPrice = priceData.minPrice;
                updated = true;
              }
              if (existing.maxPrice !== priceData.maxPrice) {
                existing.maxPrice = priceData.maxPrice;
                updated = true;
              }
              if (existing.source !== 'AGMARKNET') {
                existing.source = 'AGMARKNET';
                updated = true;
              }
              
              if (updated) {
                await existing.save();
                updatedCount++;
              }
            } else {
              await MandiPrice.create(priceData);
              savedCount++;
            }
          } catch (saveError) {
            console.error('Error saving price data:', saveError.message);
          }
        }
        
        fetchedCount = realPrices.length;
        apiSuccess = true;
        
        return res.json({
          success: true,
          message: 'Data refreshed successfully from Government API',
          stats: {
            totalRecords: realPrices.length,
            newRecords: savedCount,
            updatedRecords: updatedCount,
            dataSource: 'Government of India - AGMARKNET (Live)',
            fetchedAt: new Date()
          }
        });
      }
    } catch (apiError) {
      console.log(`⚠️ Government API fetch failed: ${apiError.message}`);
      // Don't return error yet, fall through to cached data response
    }
    
    // If API failed but we have cached data, return success with cached data info
    if (!apiSuccess && existingCount > 0) {
      const latestPrice = await MandiPrice.findOne(existingQuery)
        .sort({ date: -1 });
      
      return res.json({
        success: true,
        message: 'Using cached data (Government API currently unavailable)',
        stats: {
          totalRecords: existingCount,
          dataSource: 'AGMARKNET (Cached from previous sync)',
          lastUpdated: latestPrice?.date || new Date(),
          note: 'Government API is temporarily unavailable. Showing realistic cached data based on Karnataka APMC rates.'
        }
      });
    }
    
    // Only return error if we have NO data at all
    return res.status(404).json({ 
      error: 'No data available',
      message: 'Government API is currently unavailable and no cached data exists for this selection. Please try again later or select a different crop/location.',
      dataSource: 'Government of India - AGMARKNET'
    });
    
  } catch (error) {
    console.error('Error refreshing mandi data:', error);
    res.status(500).json({ error: 'Failed to refresh data', details: error.message });
  }
});

export default router;
