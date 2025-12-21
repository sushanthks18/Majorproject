import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Government API endpoint for mandi prices
const AGMARKNET_API = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const API_KEY = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

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
  'Coffee': 'Coffee'
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAPICall(crop, index) {
  // Add delay to avoid rate limiting
  await delay(index * 2000);
  
  try {
    const apiCrop = CROP_MAPPING[crop] || crop;
    
    // Build API URL with filters
    const params = new URLSearchParams({
      'api-key': API_KEY,
      'format': 'json',
      'limit': '5',
      'filters[state]': 'Karnataka',
      'filters[commodity]': apiCrop
    });

    const url = `${AGMARKNET_API}?${params.toString()}`;
    
    console.log(`Testing API for ${crop} (${apiCrop})...`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (!response.ok) {
      console.log(`❌ API returned ${response.status} for ${crop}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.records || data.records.length === 0) {
      console.log(`⚠️  No data found for ${crop}`);
      return null;
    }

    console.log(`✅ Found ${data.records.length} records for ${crop}`);
    console.log('Sample record:', JSON.stringify(data.records[0], null, 2));
    
    return data.records;
  } catch (error) {
    console.error(`❌ Error fetching data for ${crop}:`, error.message);
    return null;
  }
}

// Test a few key crops one by one to avoid rate limiting
const testCrops = ['Rice', 'Maize', 'Ragi', 'Chickpea', 'Banana'];

console.log('Testing Government API for Mandi Prices...\n');

async function runTests() {
  for (let i = 0; i < testCrops.length; i++) {
    await testAPICall(testCrops[i], i);
  }
  console.log('\nAPI test completed.');
}

runTests();