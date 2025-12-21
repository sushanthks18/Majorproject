import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartagri', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Import MandiPrice model
import('./models/MandiPrice.js').then(async (module) => {
  const MandiPrice = module.default;
  
  // Calculate daysAgo for 30 days (default)
  const days = 30;
  const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  console.log('Current date:', new Date());
  console.log('Days ago (30 days):', daysAgo);
  
  // Check data for Ragi at Bangalore APMC with the same query as the API
  const query = {
    crop: 'Ragi',
    location: 'Bangalore APMC',
    date: { $gte: daysAgo }
  };
  
  console.log('\nQuery:', JSON.stringify(query, null, 2));
  
  const data = await MandiPrice.find(query).sort({ date: 1 });
  console.log(`\nRagi data at Bangalore APMC matching query: ${data.length} records`);
  
  if (data.length > 0) {
    console.log('Sample record:', data[0]);
  } else {
    // Check all Ragi data at Bangalore APMC regardless of date
    const allRagiData = await MandiPrice.find({ crop: 'Ragi', location: 'Bangalore APMC' }).sort({ date: 1 });
    console.log(`\nAll Ragi data at Bangalore APMC: ${allRagiData.length} records`);
    if (allRagiData.length > 0) {
      console.log('Sample record:', allRagiData[0]);
      console.log('Record date:', allRagiData[0].date);
      console.log('Date comparison:', allRagiData[0].date >= daysAgo ? 'MATCHES' : 'DOES NOT MATCH');
    }
  }
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error importing model:', err);
  process.exit(1);
});