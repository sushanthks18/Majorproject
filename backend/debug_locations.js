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
  
  // Check all locations for Ragi
  const ragiRecords = await MandiPrice.find({ crop: 'Ragi' });
  console.log(`Ragi records: ${ragiRecords.length}`);
  
  const locations = [...new Set(ragiRecords.map(r => r.location))];
  console.log('Ragi locations:', locations);
  
  // Check specific record
  if (ragiRecords.length > 0) {
    console.log('Sample record:', ragiRecords[0]);
    console.log('Location type:', typeof ragiRecords[0].location);
    console.log('Location value:', `"${ragiRecords[0].location}"`);
    
    // Check if there's a whitespace issue
    console.log('Trimmed location:', `"${ragiRecords[0].location.trim()}"`);
    console.log('Length:', ragiRecords[0].location.length);
    
    // Check for special characters
    for (let i = 0; i < ragiRecords[0].location.length; i++) {
      const char = ragiRecords[0].location.charCodeAt(i);
      if (char < 32 || char > 126) {
        console.log(`Special character at position ${i}: ${char}`);
      }
    }
  }
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error importing model:', err);
  process.exit(1);
});