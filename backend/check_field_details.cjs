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

// Check field details
async function checkFieldDetails() {
  try {
    console.log('🔍 Checking field details in database...');
    const fields = await Field.find().lean();
    
    console.log(`Found ${fields.length} fields:`);
    fields.forEach((field, index) => {
      console.log(`\n--- Field ${index + 1} ---`);
      console.log(`ID: ${field._id}`);
      console.log(`Name: ${field.name}`);
      console.log(`Farmer ID: ${field.farmerId}`);
      console.log(`Registration Type: ${field.registrationType}`);
      console.log(`Area: ${field.areaHectares} hectares`);
      console.log(`Center: ${field.centerLat}, ${field.centerLng}`);
      console.log(`Survey Number: ${field.surveyNumber || 'N/A'}`);
      console.log(`State: ${field.state || 'N/A'}`);
      console.log(`Created: ${field.createdAt}`);
      
      // Show boundary coordinates
      if (field.boundary && field.boundary.coordinates) {
        console.log(`Boundary coordinates:`);
        field.boundary.coordinates[0].forEach((coord, i) => {
          console.log(`  Point ${i + 1}: [${coord[0]}, ${coord[1]}]`);
        });
        
        // Calculate area manually to debug
        const coords = field.boundary.coordinates[0];
        let area = 0;
        for (let i = 0; i < coords.length - 1; i++) {
          area += (coords[i][0] * coords[i + 1][1]) - (coords[i + 1][0] * coords[i][1]);
        }
        area = Math.abs(area) / 2;
        const hectares = area * 1232100 / (180 * 180);
        console.log(`Calculated area: ${area} deg², ${hectares.toFixed(2)} hectares`);
      }
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error checking fields:', error);
    mongoose.connection.close();
  }
}

checkFieldDetails();