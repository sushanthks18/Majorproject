import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-agriculture', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Import MandiPrice model
import('./models/MandiPrice.js').then(async (module) => {
  const MandiPrice = module.default;
  
  // Current date
  const currentDate = new Date();
  
  // Sample data for key crops with recent dates
  const sampleData = [
    // Rice data - 5 days ago
    {
      crop: 'Rice',
      location: 'Bangalore APMC',
      price: 2800,
      minPrice: 2600,
      maxPrice: 3000,
      date: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000),
      state: 'Karnataka',
      district: 'Bangalore',
      variety: 'Sona Masuri',
      source: 'System'
    },
    {
      crop: 'Rice',
      location: 'Bangalore APMC',
      price: 2850,
      minPrice: 2650,
      maxPrice: 3050,
      date: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      state: 'Karnataka',
      district: 'Bangalore',
      variety: 'Sona Masuri',
      source: 'System'
    },
    // Maize data - 3 days ago
    {
      crop: 'Maize',
      location: 'Bangalore APMC',
      price: 1800,
      minPrice: 1700,
      maxPrice: 1900,
      date: new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      state: 'Karnataka',
      district: 'Bangalore',
      variety: 'Local',
      source: 'System'
    },
    // Ragi data (Important for Karnataka) - 4 days ago
    {
      crop: 'Ragi',
      location: 'Bangalore APMC',
      price: 3200,
      minPrice: 3000,
      maxPrice: 3400,
      date: new Date(currentDate.getTime() - 4 * 24 * 60 * 60 * 1000),
      state: 'Karnataka',
      district: 'Bangalore',
      variety: 'Local',
      source: 'System'
    },
    // Chickpea data - 1 day ago
    {
      crop: 'Chickpea',
      location: 'Bangalore APMC',
      price: 4500,
      minPrice: 4200,
      maxPrice: 4800,
      date: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000),
      state: 'Karnataka',
      district: 'Bangalore',
      variety: 'Local',
      source: 'System'
    }
  ];
  
  try {
    // Clear existing data
    await MandiPrice.deleteMany({});
    console.log('🧹 Cleared existing MandiPrice data');
    
    // Insert sample data
    await MandiPrice.insertMany(sampleData);
    console.log('✅ Inserted sample MandiPrice data');
    
    // Verify data
    const count = await MandiPrice.countDocuments();
    console.log(`📊 Total records in database: ${count}`);
    
    // Show sample of data
    const sampleRecords = await MandiPrice.find().sort({ date: -1 }).limit(5);
    console.log('\n📝 Sample records:');
    sampleRecords.forEach(record => {
      console.log(`  - ${record.crop} at ${record.location}: ₹${record.price}/quintal on ${record.date.toDateString()}`);
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error populating data:', error);
    mongoose.connection.close();
  }
}).catch(err => {
  console.error('Error importing model:', err);
  process.exit(1);
});