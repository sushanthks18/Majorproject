import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MandiPrice from './models/MandiPrice.js';
import fetch from 'node-fetch';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-agriculture', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Import the sync function directly from the mandi.js file
const AGMARKNET_API = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const API_KEY = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

// Crop name mapping (frontend to API) - Priority crops for Karnataka
const CROP_MAPPING = {
  // Priority crops for Karnataka
  'Ragi': 'Ragi',  // Finger Millet - Karnataka's staple crop
  'Rice': 'Rice',
  'Maize': 'Maize',
  'Chickpea': 'Gram',
  'Pigeonpeas': 'Tur(Arhar)',
  'Cotton': 'Cotton',
  'Jute': 'Jute',
  'Coffee': 'Coffee'
};

// Priority markets in Karnataka
const MARKET_MAPPING = {
  'Bangalore APMC': { state: 'Karnataka', district: 'Bangalore' },
  'Mysore APMC': { state: 'Karnataka', district: 'Mysore' },
  'Hubli APMC': { state: 'Karnataka', district: 'Dharwad' }
};

/**
 * Fetch real mandi prices from Government of India API
 * Data source: AGMARKNET (Agricultural Marketing Department)
 */
async function fetchRealMandiPrices(crop, state = 'Karnataka', limit = 50) {
  try {
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
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (!response.ok) {
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

// Priority crops and locations to sync (focus on what's most important)
const PRIORITY_CROPS = ['Ragi', 'Rice', 'Maize', 'Chickpea', 'Cotton'];
const PRIORITY_LOCATIONS = ['Bangalore APMC', 'Mysore APMC'];

async function syncPriorityData() {
  console.log('🔄 Starting priority government data sync...');
  
  let totalSynced = 0;
  let totalErrors = 0;
  
  // Sync priority combinations first
  for (const crop of PRIORITY_CROPS) {
    for (const location of PRIORITY_LOCATIONS) {
      try {
        console.log(`\n🔄 Syncing ${crop} data for ${location}...`);
        const result = await syncMandiPricesToDB(crop, location);
        if (result) {
          totalSynced++;
        }
      } catch (error) {
        console.error(`❌ Error syncing ${crop} for ${location}:`, error.message);
        totalErrors++;
        
        // If we hit rate limits, wait before continuing
        if (error.message.includes('429')) {
          console.log('⏳ Hit rate limit, waiting 2 minutes before continuing...');
          await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000)); // Wait 2 minutes
        }
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n✅ Priority sync completed! Successfully synced: ${totalSynced}, Errors: ${totalErrors}`);
  return { synced: totalSynced, errors: totalErrors };
}

// Export the function so it can be used by the server
export { syncPriorityData };

// Run the sync if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncPriorityData().then(() => {
    mongoose.connection.close();
  }).catch(err => {
    console.error('Fatal error during sync:', err);
    mongoose.connection.close();
  });
}