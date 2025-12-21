import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: __dirname + '/.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartagri', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

import('./models/MandiPrice.js').then(async (module) => {
  const MandiPrice = module.default;
  
  // Get all crops with data
  const cropsWithPrices = await MandiPrice.distinct('crop');
  console.log('Crops with price data:', cropsWithPrices);
  
  // Check data for each of the 23 crops
  const allCrops = [
    'Rice', 'Maize', 'Ragi', 'Chickpea', 'Kidneybeans', 'Pigeonpeas', 
    'Mothbeans', 'Mungbean', 'Blackgram', 'Lentil', 'Pomegranate', 'Banana', 
    'Mango', 'Grapes', 'Watermelon', 'Muskmelon', 'Apple', 'Orange', 
    'Papaya', 'Coconut', 'Cotton', 'Jute', 'Coffee'
  ];
  
  console.log('\n--- Crop Data Availability ---');
  for (const crop of allCrops) {
    const count = await MandiPrice.countDocuments({ crop });
    const hasData = count > 0;
    console.log(`${crop.padEnd(15)}: ${hasData ? '✅ Yes (' + count + ' records)' : '❌ No'}`);
  }
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});