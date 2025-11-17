import express from 'express';
import Field from '../models/Field.js';
import { authenticate } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

// Helper function to calculate area in hectares from polygon
function calculateAreaHectares(coordinates) {
  // Simple approximation using shoelace formula
  // For production, use turf.js for accurate geodesic calculations
  const ring = coordinates[0];
  let area = 0;
  
  for (let i = 0; i < ring.length - 1; i++) {
    area += (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
  }
  
  area = Math.abs(area) / 2;
  
  // Convert to hectares (rough approximation at equator)
  // 1 degree ≈ 111 km, so 1 deg² ≈ 12,321 km² ≈ 1,232,100 ha
  const hectares = area * 1232100 / (180 * 180);
  
  return Math.round(hectares * 100) / 100; // Round to 2 decimals
}

// Helper function to create circle polygon from center and radius
function createCirclePolygon(lat, lng, radiusMeters) {
  const points = 32; // Number of points to approximate circle
  const coordinates = [];
  
  // Earth radius in meters
  const R = 6371000;
  
  for (let i = 0; i <= points; i++) {
    const angle = (i * 360 / points) * Math.PI / 180;
    
    // Calculate point on circle
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    
    const newLat = lat + (dy / R) * (180 / Math.PI);
    const newLng = lng + (dx / R) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
    
    coordinates.push([newLng, newLat]); // GeoJSON format: [lng, lat]
  }
  
  return [coordinates]; // Return as array of rings
}

// Register field by GPS (center + radius)
router.post('/register-by-gps', authenticate, async (req, res) => {
  try {
    const { name, centerLat, centerLng, radiusMeters, soilType, cropType } = req.body;
    
    if (!name || !centerLat || !centerLng || !radiusMeters) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate India bounds (8-37°N, 68-97°E)
    if (centerLat < 8 || centerLat > 37 || centerLng < 68 || centerLng > 97) {
      return res.status(400).json({ error: 'Location must be within India' });
    }
    
    // Create circular boundary
    const coordinates = createCirclePolygon(centerLat, centerLng, radiusMeters);
    const areaHectares = Math.PI * Math.pow(radiusMeters, 2) / 10000;
    
    // Check minimum size
    if (areaHectares < 0.1) {
      return res.status(400).json({ 
        error: 'Field too small. Minimum 0.1 hectares (1000 m²) required for satellite analysis' 
      });
    }
    
    const field = new Field({
      farmerId: req.userId,
      name,
      registrationType: 'gps',
      centerLat,
      centerLng,
      radiusMeters,
      boundary: {
        type: 'Polygon',
        coordinates
      },
      areaHectares: Math.round(areaHectares * 100) / 100,
      soilType,
      cropType,
      verificationStatus: 'unverified'
    });
    
    await field.save();
    
    console.log(`✅ Field registered: ${name}, ${areaHectares} ha`);
    
    res.status(201).json({
      message: 'Field registered successfully',
      field
    });
  } catch (error) {
    console.error('Error registering field:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register field by polygon coordinates
router.post('/register-by-polygon', authenticate, async (req, res) => {
  try {
    const { name, coordinates, soilType, cropType } = req.body;
    
    if (!name || !coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Ensure polygon is closed (first and last points must be same)
    const ring = coordinates[0];
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push(ring[0]); // Close the polygon
    }
    
    const areaHectares = calculateAreaHectares(coordinates);
    
    // Ensure minimum area for satellite analysis
    if (areaHectares < 0.5) {
      return res.status(400).json({ 
        error: 'Field too small. Minimum 0.5 hectares required for satellite analysis' 
      });
    }
    
    // Calculate center point (centroid approximation)
    const lats = ring.map(p => p[1]);
    const lngs = ring.map(p => p[0]);
    const centerLat = lats.reduce((a, b) => a + b) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b) / lngs.length;
    
    const field = new Field({
      farmerId: req.userId,
      name,
      registrationType: 'polygon',
      centerLat,
      centerLng,
      boundary: {
        type: 'Polygon',
        coordinates
      },
      areaHectares,
      soilType,
      cropType,
      verificationStatus: 'unverified'
    });
    
    await field.save();
    
    console.log(`✅ Field registered by polygon: ${name}, ${areaHectares} ha`);
    
    res.status(201).json({
      message: 'Field registered successfully',
      field
    });
  } catch (error) {
    console.error('Error registering field:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all fields for logged-in farmer
router.get('/', authenticate, async (req, res) => {
  try {
    const fields = await Field.find({ farmerId: req.userId }).sort({ createdAt: -1 });
    
    res.json(fields);
  } catch (error) {
    console.error('Error fetching fields:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single field by ID
router.get('/:fieldId', authenticate, async (req, res) => {
  try {
    const field = await Field.findOne({ 
      _id: req.params.fieldId,
      farmerId: req.userId 
    });
    
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    res.json({ field });
  } catch (error) {
    console.error('Error fetching field:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update field
router.put('/:fieldId', authenticate, async (req, res) => {
  try {
    const { name, soilType, cropType } = req.body;
    
    const field = await Field.findOneAndUpdate(
      { _id: req.params.fieldId, farmerId: req.userId },
      { name, soilType, cropType },
      { new: true }
    );
    
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    res.json({ message: 'Field updated', field });
  } catch (error) {
    console.error('Error updating field:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete field
router.delete('/:fieldId', authenticate, async (req, res) => {
  try {
    const field = await Field.findOneAndDelete({ 
      _id: req.params.fieldId,
      farmerId: req.userId 
    });
    
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    
    res.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error('Error deleting field:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch land records from government database
router.post('/fetch-land-records', authenticate, async (req, res) => {
  try {
    const { state, district, taluk, village, surveyNumber } = req.body;
    
    if (!surveyNumber) {
      return res.status(400).json({ error: 'Survey number is required' });
    }
    
    console.log(`🔍 Fetching land records: ${state}/${district}/${surveyNumber}`);
    
    // Check if real government API is enabled
    const useRealAPI = process.env.USE_REAL_GOVT_API === 'true';
    
    if (useRealAPI) {
      // REAL GOVERNMENT API INTEGRATION
      try {
        let apiResponse;
        
        switch(state) {
          case 'Karnataka':
            console.log('📡 Calling Karnataka Bhoomi API...');
            apiResponse = await axios.post(
              `${process.env.BHOOMI_API_URL}/fetch-land-record`,
              {
                district,
                taluk,
                village,
                surveyNumber
              },
              {
                headers: {
                  'Authorization': `Bearer ${process.env.BHOOMI_API_KEY}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            break;
            
          case 'Maharashtra':
            console.log('📡 Calling Maharashtra Mahabhulekh API...');
            apiResponse = await axios.post(
              `${process.env.MAHABHULEKH_API_URL}/land-record`,
              {
                district,
                taluk,
                village,
                surveyNumber
              },
              {
                headers: {
                  'X-API-Key': process.env.MAHABHULEKH_API_KEY,
                  'Content-Type': 'application/json'
                }
              }
            );
            break;
            
          case 'Andhra Pradesh':
            console.log('📡 Calling Andhra Pradesh Meebhoomi API...');
            apiResponse = await axios.post(
              `${process.env.MEEBHOOMI_API_URL}/land-details`,
              {
                district,
                mandal: taluk,
                village,
                surveyNo: surveyNumber
              },
              {
                headers: {
                  'API-Key': process.env.MEEBHOOMI_API_KEY,
                  'Content-Type': 'application/json'
                }
              }
            );
            break;
            
          default:
            throw new Error(`API not configured for state: ${state}`);
        }
        
        // Parse real API response
        const data = apiResponse.data;
        
        res.json({
          success: true,
          fieldName: data.ownerName ? `${data.ownerName}'s Field` : `Survey ${surveyNumber}`,
          boundary: data.boundary || data.coordinates,
          area: data.area || data.totalArea,
          soilType: data.soilType || 'Not specified',
          ownerName: data.ownerName,
          landUse: data.landUse,
          irrigation: data.irrigationType,
          state,
          district,
          taluk,
          village,
          surveyNumber,
          source: `Government Land Records - ${state}`,
          message: 'Land records fetched successfully from government database'
        });
        
      } catch (apiError) {
        console.error('❌ Government API error:', apiError.message);
        
        // Fallback to mock data if API fails
        console.log('⚠️  Falling back to demo mode...');
        const mockBoundary = generateMockFieldBoundary(state, district, surveyNumber);
        
        res.json({
          success: true,
          fieldName: `Survey ${surveyNumber}`,
          boundary: mockBoundary.coordinates,
          area: mockBoundary.area,
          soilType: mockBoundary.soilType,
          state,
          district,
          taluk,
          village,
          surveyNumber,
          source: 'Demo Mode (API Error)',
          message: `Failed to fetch from government API: ${apiError.message}. Using demo data.`,
          isDemo: true
        });
      }
    } else {
      // DEMO MODE - Mock data
      console.log('📋 Using demo mode (USE_REAL_GOVT_API=false)');
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockBoundary = generateMockFieldBoundary(state, district, surveyNumber);
        
        console.log('✅ Generated mock boundary:', {
          surveyNumber,
          area: mockBoundary.area,
          soilType: mockBoundary.soilType,
          coordinates: mockBoundary.coordinates.length
        });
        
        res.json({
          success: true,
          fieldName: `Survey ${surveyNumber}`,
          boundary: mockBoundary.coordinates,
          area: mockBoundary.area,
          soilType: mockBoundary.soilType,
          state,
          district,
          taluk,
          village,
          surveyNumber,
          source: 'Demo Mode',
          message: 'Land records simulation (Enable USE_REAL_GOVT_API for real data)',
          isDemo: true
        });
      } catch (mockError) {
        console.error('❌ Error generating mock data:', mockError);
        throw mockError;
      }
    }
    
  } catch (error) {
    console.error('Error fetching land records:', error);
    res.status(500).json({ 
      error: 'Failed to fetch land records',
      message: error.message,
      suggestion: 'Please enter field boundary manually or try again later'
    });
  }
});

// Detect soil type based on GPS coordinates
router.post('/detect-soil-type', authenticate, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    console.log(`🌍 Detecting soil type at: ${latitude}, ${longitude}`);
    
    // In production, integrate with:
    // - SoilGrids API (https://rest.soilgrids.org/)
    // - ISRIC World Soil Information
    // - NBSS&LUP (National Bureau of Soil Survey)
    // - State agricultural department APIs
    
    // For demo: Detect based on region (using coordinate ranges)
    const soilData = detectSoilByLocation(latitude, longitude);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({
      soilType: soilData.type,
      characteristics: soilData.characteristics,
      suitableFor: soilData.suitableFor,
      pH: soilData.pH,
      source: 'Soil Detection System',
      coordinates: { latitude, longitude }
    });
    
  } catch (error) {
    console.error('Error detecting soil type:', error);
    res.status(500).json({ 
      error: 'Failed to detect soil type',
      message: error.message
    });
  }
});

// Register field using survey number (with fetched boundary)
router.post('/register-by-survey', authenticate, async (req, res) => {
  try {
    const { name, coordinates, state, district, taluk, village, surveyNumber, soilType, cropType } = req.body;
    
    if (!name || !coordinates || !surveyNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Ensure polygon is closed
    const ring = coordinates[0];
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push(ring[0]);
    }
    
    const areaHectares = calculateAreaHectares(coordinates);
    
    // Calculate center point
    const lats = ring.map(p => p[1]);
    const lngs = ring.map(p => p[0]);
    const centerLat = lats.reduce((a, b) => a + b) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b) / lngs.length;
    
    const field = new Field({
      farmerId: req.userId,
      name,
      registrationType: 'survey',
      centerLat,
      centerLng,
      boundary: {
        type: 'Polygon',
        coordinates
      },
      areaHectares,
      surveyNumber,
      state,
      district,
      taluk,
      village,
      soilType,
      cropType,
      verificationStatus: 'verified' // Auto-verified since from govt records
    });
    
    await field.save();
    
    console.log(`✅ Field registered via survey number: ${surveyNumber}, ${areaHectares} ha`);
    
    res.status(201).json({
      message: 'Field registered successfully from land records',
      fieldId: field._id,
      areaHectares,
      field
    });
  } catch (error) {
    console.error('Error registering field:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to generate mock field boundary
function generateMockFieldBoundary(state, district, surveyNumber) {
  // Base coordinates for agricultural/rural areas (NOT city centers)
  const stateCoordinates = {
    'Karnataka': { lat: 13.1000, lng: 77.5500 }, // Kanakapura Road - Agricultural belt
    'Maharashtra': { lat: 18.5200, lng: 73.8567 }, // Pune rural area
    'Andhra Pradesh': { lat: 16.3067, lng: 80.4365 }, // Guntur rural
    'Tamil Nadu': { lat: 11.0168, lng: 76.9558 }, // Coimbatore rural
    'Telangana': { lat: 17.5850, lng: 78.1167 }  // Rangareddy rural
  };
  
  const baseCoord = stateCoordinates[state] || { lat: 13.1000, lng: 77.5500 };
  
  // Generate consistent offset based on survey number (spread fields in rural area)
  let hash = 0;
  if (surveyNumber) {
    for (let i = 0; i < surveyNumber.length; i++) {
      hash = surveyNumber.charCodeAt(i) + ((hash << 5) - hash);
    }
  }
  
  // Use hash to generate offset - spread in agricultural zones
  const latOffset = ((Math.abs(hash) % 200) - 100) / 1000; // -0.1 to +0.1 degrees
  const lngOffset = ((Math.abs(hash >> 8) % 200) - 100) / 1000;
  
  const centerLat = baseCoord.lat + latOffset;
  const centerLng = baseCoord.lng + lngOffset;
  
  // Generate rectangular field boundary (realistic farm size)
  const size = 0.005; // About 3 hectares (typical Indian farm)
  
  const boundary = [
    [centerLng - size, centerLat - size],
    [centerLng + size, centerLat - size],
    [centerLng + size, centerLat + size],
    [centerLng - size, centerLat + size],
    [centerLng - size, centerLat - size] // Close polygon
  ];
  
  // Calculate approximate area
  const area = parseFloat((size * size * 12321).toFixed(2));
  
  // Ensure minimum area for satellite analysis
  const finalArea = Math.max(area, 1.2);
  
  // Soil types based on region
  const soilTypes = ['Red Soil', 'Black Soil (Regur)', 'Clay Loam', 'Sandy Loam', 'Alluvial Soil'];
  const soilType = soilTypes[Math.abs(hash) % soilTypes.length];
  
  return {
    coordinates: [boundary],
    area: finalArea,
    soilType
  };
}

// Helper function to detect soil type based on GPS coordinates
function detectSoilByLocation(lat, lng) {
  // Soil distribution map of India (simplified)
  // Based on general geological patterns
  
  // Karnataka - predominantly Red and Black soil
  if (lat >= 11.5 && lat <= 18.5 && lng >= 74 && lng <= 78.5) {
    if (lat > 15) {
      return {
        type: 'Black Soil (Regur)',
        characteristics: 'Rich in clay, retains moisture well, ideal for cotton',
        suitableFor: 'Cotton, Wheat, Jowar, Linseed',
        pH: '7.2-8.5 (Slightly alkaline)'
      };
    } else {
      return {
        type: 'Red Soil',
        characteristics: 'Rich in iron, good drainage, suitable for diverse crops',
        suitableFor: 'Groundnut, Ragi, Tobacco, Potato',
        pH: '5.5-7.0 (Slightly acidic to neutral)'
      };
    }
  }
  
  // Maharashtra - Black soil (Deccan Plateau)
  if (lat >= 15 && lat <= 22 && lng >= 72 && lng <= 80) {
    return {
      type: 'Black Soil (Regur)',
      characteristics: 'Rich in calcium carbonate, high water retention',
      suitableFor: 'Cotton, Sugarcane, Wheat, Jowar',
      pH: '7.0-8.5 (Neutral to alkaline)'
    };
  }
  
  // Tamil Nadu - Red and Laterite
  if (lat >= 8 && lat <= 13.5 && lng >= 76 && lng <= 80.5) {
    if (lat < 10) {
      return {
        type: 'Laterite Soil',
        characteristics: 'High in iron and aluminum, acidic nature',
        suitableFor: 'Tea, Coffee, Cashew, Rubber',
        pH: '4.5-6.0 (Acidic)'
      };
    } else {
      return {
        type: 'Red Soil',
        characteristics: 'Porous, friable structure, low fertility',
        suitableFor: 'Groundnut, Millets, Tobacco',
        pH: '6.0-7.0 (Slightly acidic)'
      };
    }
  }
  
  // Andhra Pradesh - Red and Black soil
  if (lat >= 12.5 && lat <= 19.5 && lng >= 76.5 && lng <= 84.5) {
    if (lng > 80) {
      return {
        type: 'Alluvial Soil',
        characteristics: 'Rich in potash, highly fertile, good water retention',
        suitableFor: 'Rice, Sugarcane, Wheat, Maize',
        pH: '6.5-7.5 (Neutral)'
      };
    } else {
      return {
        type: 'Red Soil',
        characteristics: 'Medium fertility, good for diverse crops',
        suitableFor: 'Cotton, Tobacco, Groundnut',
        pH: '6.0-7.5 (Slightly acidic to neutral)'
      };
    }
  }
  
  // Telangana - Black and Red soil
  if (lat >= 15.5 && lat <= 19.5 && lng >= 77 && lng <= 81.5) {
    return {
      type: 'Black Soil (Regur)',
      characteristics: 'Deep, impermeable, rich in montmorillonite',
      suitableFor: 'Cotton, Jowar, Wheat, Pulses',
      pH: '7.2-8.5 (Alkaline)'
    };
  }
  
  // Indo-Gangetic Plain - Alluvial soil
  if (lat >= 24 && lat <= 32 && lng >= 70 && lng <= 89) {
    return {
      type: 'Alluvial Soil',
      characteristics: 'Most fertile soil, rich in nutrients, well-drained',
      suitableFor: 'Rice, Wheat, Sugarcane, Jute, Vegetables',
      pH: '6.5-7.5 (Neutral)'
    };
  }
  
  // Default - Clay Loam (most common)
  return {
    type: 'Clay Loam',
    characteristics: 'Balanced mixture of clay, silt, and sand',
    suitableFor: 'Most crops - Rice, Wheat, Vegetables',
    pH: '6.0-7.5 (Slightly acidic to neutral)'
  };
}

export default router;
