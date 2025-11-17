const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/smart-agriculture');

// Define Field schema
const fieldSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  registrationType: {
    type: String,
    enum: ['gps', 'polygon', 'survey'],
    required: true
  },
  centerLat: Number,
  centerLng: Number,
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]],
      required: true
    }
  },
  areaHectares: {
    type: Number,
    required: true
  },
  surveyNumber: String,
  state: String,
  district: String,
  taluk: String,
  village: String,
  soilType: String,
  cropType: String,
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'unverified'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Field = mongoose.model('Field', fieldSchema);

// Check fields
async function checkFields() {
  try {
    console.log('🔍 Checking fields in database...');
    const fields = await Field.find().lean();
    
    console.log(`Found ${fields.length} fields:`);
    fields.forEach((field, index) => {
      console.log(`\n--- Field ${index + 1} ---`);
      console.log(`ID: ${field._id}`);
      console.log(`Name: ${field.name}`);
      console.log(`Farmer ID: ${field.farmerId}`);
      console.log(`Registration Type: ${field.registrationType}`);
      console.log(`Area: ${field.areaHectares} hectares`);
      console.log(`Survey Number: ${field.surveyNumber || 'N/A'}`);
      console.log(`State: ${field.state || 'N/A'}`);
      console.log(`Created: ${field.createdAt}`);
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error checking fields:', error);
    mongoose.connection.close();
  }
}

checkFields();