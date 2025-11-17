import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import Field from '../models/Field.js';
import SatelliteAnalysis from '../models/SatelliteAnalysis.js';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper function to call Python satellite service
function callPythonService(action, args) {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(__dirname, '..', 'satellite_service.py');
    const python = spawn('python3', [pythonPath, action]);
    
    let dataString = '';
    let errorString = '';
    
    // Send data via stdin
    python.stdin.write(JSON.stringify(args));
    python.stdin.end();
    
    python.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorString += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python error:', errorString);
        reject(new Error(errorString || 'Python service failed'));
      } else {
        try {
          resolve(JSON.parse(dataString));
        } catch (e) {
          console.error('Parse error:', e, 'Data:', dataString);
          reject(new Error('Invalid JSON response from Python service'));
        }
      }
    });
  });
}

// Fetch satellite data for a field
router.post('/fetch-data/:fieldId', authenticate, async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { daysBack = 30 } = req.body;
    
    const field = await Field.findById(fieldId);
    
    if (!field) {
      console.log(`❌ Field not found: ${fieldId}`);
      return res.status(404).json({ error: 'Field not found' });
    }
    
    console.log(`🔍 Field found: ${field.name}, Farmer: ${field.farmerId}, Requester: ${req.userId}`);
    
    if (field.farmerId.toString() !== req.userId.toString()) {
      console.log(`❌ Unauthorized access: Field ${fieldId} belongs to ${field.farmerId}, but requested by ${req.userId}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    console.log(`📡 Fetching satellite data for field ${fieldId}...`);
    
    // Get center coordinates from field boundary
    const coords = field.boundary.coordinates[0];
    let centerLat = 0, centerLng = 0;
    coords.forEach(coord => {
      centerLng += coord[0];
      centerLat += coord[1];
    });
    centerLat /= coords.length;
    centerLng /= coords.length;
    
    // Call Python service to fetch satellite data
    const result = await callPythonService('fetch', {
      fieldId: fieldId,
      bounds: {
        coordinates: field.boundary.coordinates,
        centerLat: centerLat,
        centerLng: centerLng
      },
      daysBack: daysBack
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching satellite data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch satellite data',
      message: error.message 
    });
  }
});

// Analyze NDVI for a field
router.post('/analyze-ndvi/:fieldId', authenticate, async (req, res) => {
  try {
    const { fieldId } = req.params;
    
    const field = await Field.findById(fieldId);
    
    if (!field) {
      console.log(`❌ Field not found: ${fieldId}`);
      return res.status(404).json({ error: 'Field not found' });
    }
    
    console.log(`🔍 Field found: ${field.name}, Farmer: ${field.farmerId}, Requester: ${req.userId}`);
    
    if (field.farmerId.toString() !== req.userId.toString()) {
      console.log(`❌ Unauthorized access: Field ${fieldId} belongs to ${field.farmerId}, but requested by ${req.userId}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    console.log(`🌱 Analyzing NDVI for field ${fieldId}...`);
    
    // Get center coordinates from field boundary
    const coords = field.boundary.coordinates[0];
    let centerLat = 0, centerLng = 0;
    coords.forEach(coord => {
      centerLng += coord[0];
      centerLat += coord[1];
    });
    centerLat /= coords.length;
    centerLng /= coords.length;
    
    // Call Python service for NDVI analysis
    const analysisResult = await callPythonService('analyze', {
      fieldId: fieldId,
      bounds: {
        coordinates: field.boundary.coordinates,
        centerLat: centerLat,
        centerLng: centerLng
      },
      areaHectares: field.areaHectares
    });
    
    // Save analysis to database
    const analysis = new SatelliteAnalysis({
      fieldId: fieldId,
      acquisitionDate: analysisResult.acquisition_date,
      satelliteName: analysisResult.satellite,
      cloudCover: analysisResult.cloud_cover,
      resolution: analysisResult.resolution,
      meanNdvi: analysisResult.mean_ndvi,
      healthScore: analysisResult.health_score,
      zones: analysisResult.zones,
      sensorPlacements: analysisResult.sensor_placements,
      totalSensorsNeeded: analysisResult.total_sensors_needed
    });
    
    await analysis.save();
    
    console.log(`✅ NDVI analysis saved for field ${fieldId}`);
    
    res.json({
      success: true,
      analysisId: analysis._id,
      ...analysisResult
    });
  } catch (error) {
    console.error('Error analyzing NDVI:', error);
    res.status(500).json({ 
      error: 'Failed to analyze NDVI',
      message: error.message 
    });
  }
});

// Get analysis history for a field
router.get('/history/:fieldId', authenticate, async (req, res) => {
  try {
    const { fieldId } = req.params;
    
    const field = await Field.findById(fieldId);
    
    if (!field) {
      console.log(`❌ Field not found: ${fieldId}`);
      return res.status(404).json({ error: 'Field not found' });
    }
    
    console.log(`🔍 Field found: ${field.name}, Farmer: ${field.farmerId}, Requester: ${req.userId}`);
    
    if (field.farmerId.toString() !== req.userId.toString()) {
      console.log(`❌ Unauthorized access: Field ${fieldId} belongs to ${field.farmerId}, but requested by ${req.userId}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const analyses = await SatelliteAnalysis.find({ fieldId })
      .sort({ acquisitionDate: -1 })
      .limit(10);
    
    res.json(analyses);
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get latest analysis for a field
router.get('/latest/:fieldId', authenticate, async (req, res) => {
  try {
    const { fieldId } = req.params;
    
    const field = await Field.findById(fieldId);
    
    if (!field) {
      console.log(`❌ Field not found: ${fieldId}`);
      return res.status(404).json({ error: 'Field not found' });
    }
    
    console.log(`🔍 Field found: ${field.name}, Farmer: ${field.farmerId}, Requester: ${req.userId}`);
    
    if (field.farmerId.toString() !== req.userId.toString()) {
      console.log(`❌ Unauthorized access: Field ${fieldId} belongs to ${field.farmerId}, but requested by ${req.userId}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const analysis = await SatelliteAnalysis.findOne({ fieldId })
      .sort({ acquisitionDate: -1 });
    
    if (!analysis) {
      return res.status(404).json({ error: 'No analysis found for this field' });
    }
    
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching latest analysis:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
