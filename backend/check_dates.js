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
  
  // Check data for all crops
  const crops = ['Rice', 'Maize', 'Ragi', 'Chickpea'];
  
  for (const crop of crops) {
    const data = await MandiPrice.find({ crop: crop }).sort({ date: 1 });
    console.log(`\n=== ${crop} ===`);
    console.log(`Count: ${data.length}`);
    if (data.length > 0) {
      console.log(`Date range: ${data[0].date} to ${data[data.length-1].date}`);
      console.log(`Sample record date: ${data[0].date}`);
    }
  }
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error importing model:', err);
  process.exit(1);
});