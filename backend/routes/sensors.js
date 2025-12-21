import express from 'express';
import SensorData from '../models/SensorData.js';
import AggregatedSensorData from '../models/AggregatedSensorData.js';
import { authenticate, authenticateFarmer } from '../middleware/auth.js';
import { aggregateSensorData, storeAggregatedData, getLatestAggregation, compareAggregatedWithRealtime } from '../services/sensorAggregation.js';

const router = express.Router();

// Get latest sensor reading (Public endpoint - no auth required for ESP32)
router.get('/latest', async (req, res) => {
  try {
    // Get the most recent sensor data from ANY source
    const latestData = await SensorData.findOne().sort({ timestamp: -1 });

    if (!latestData) {
      // Return default/simulated data instead of 404
      return res.json({ 
        data: {
          temperature: 25,
          humidity: 60,
          soilMoisture: 45,
          pH: 7.0,
          rainfall: 0,
          timestamp: new Date(),
          _id: null,
          source: 'default'
        },
        message: 'No sensor data available. Showing default values.'
      });
    }

    // Return the data directly (not nested)
    res.json(latestData);
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get historical data
router.get('/history', authenticate, async (req, res) => {
  try {
    const { hours = 24, limit } = req.query;
    const farmerId = req.user.role === 'farmer' ? req.userId : null;

    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const query = {
      timestamp: { $gte: timeAgo }
    };
    
    if (farmerId) {
      query.farmerId = farmerId;
    }

    let dataQuery = SensorData.find(query)
      .sort({ timestamp: -1 });  // Sort newest first for limit
    
    // If limit is specified (for real-time mode), apply it
    if (limit) {
      dataQuery = dataQuery.limit(parseInt(limit));
    } else {
      dataQuery = dataQuery.limit(1000);
    }
    
    const data = await dataQuery;
    
    // Reverse to oldest first for charts (if limit was used)
    const sortedData = limit ? data.reverse() : data.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    res.json({ 
      data: sortedData,
      count: sortedData.length,
      hours: parseInt(hours),
      limit: limit ? parseInt(limit) : null
    });
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Store sensor data (Public endpoint for IoT devices - ESP32 compatible)
router.post('/data', async (req, res) => {
  try {
    let { temperature, humidity, soilMoisture, pH, farmerId, deviceId, apiKey, rainLevel, rainfall, source } = req.body;

    console.log('\n📥 [SENSOR DATA RECEIVED]');
    console.log('Raw data:', JSON.stringify(req.body, null, 2));

    // Handle both rainLevel and rainfall
    const rain = rainfall !== undefined ? rainfall : (rainLevel !== undefined ? rainLevel : 0);
    
    // Use default pH if not provided
    if (pH === undefined || pH === null) {
      pH = 7.0;
      console.log('⚠️  pH not provided, using default: 7.0');
    }

    // Basic validation
    if (temperature === undefined || humidity === undefined || soilMoisture === undefined) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required sensor data fields (temperature, humidity, soilMoisture)' });
    }

    // Convert to numbers and validate
    temperature = parseFloat(temperature);
    humidity = parseFloat(humidity);
    soilMoisture = parseFloat(soilMoisture);
    pH = parseFloat(pH);
    const rainfallValue = parseFloat(rain);

    if (isNaN(temperature) || isNaN(humidity) || isNaN(soilMoisture) || isNaN(pH)) {
      console.log('❌ Invalid number format');
      return res.status(400).json({ error: 'Invalid number format in sensor data' });
    }

    console.log('✅ Validated data:', { temperature, humidity, soilMoisture, pH, rainfall: rainfallValue });

    const sensorData = new SensorData({
      temperature,
      humidity,
      soilMoisture,
      pH,
      rainfall: rainfallValue,
      farmerId: farmerId || null,
      timestamp: new Date()
    });

    await sensorData.save();
    console.log('💾 Saved to database with ID:', sensorData._id);

    // Emit to connected clients via Socket.io
    const io = req.app.get('io') || global.io;
    if (io) {
      // Create ESP32-tagged data for frontend
      const esp32Data = {
        temperature,
        humidity,
        soilMoisture,
        pH,
        rainfall: rainfallValue,
        deviceId: deviceId || 'ESP32_SENSOR_001',
        source: source || 'krishi-sakha',
        timestamp: sensorData.timestamp,
        _id: sensorData._id
      };
      
      console.log('📡 Broadcasting to frontend:', esp32Data);
      
      // Broadcast to ALL connected clients
      io.emit('sensorUpdate', esp32Data);
      
      console.log(`✅ [ESP32 DATA] Temp: ${temperature}°C, Humidity: ${humidity}%, Soil: ${soilMoisture}%, pH: ${pH}, Rain: ${rainfallValue}%`);
      console.log(`📡 Broadcasted with deviceId: ${esp32Data.deviceId}, source: ${esp32Data.source}`);
    } else {
      console.log('⚠️  Socket.IO not available');
    }

    res.status(201).json({ 
      success: true,
      message: 'Sensor data saved and broadcasted',
      data: {
        id: sensorData._id,
        temperature,
        humidity,
        soilMoisture,
        pH,
        rainfall: rainfallValue,
        timestamp: sensorData.timestamp
      },
      received: req.body
    });
  } catch (error) {
    console.error('❌ Error saving sensor data:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Live sensor stream endpoint (Server-Sent Events)
router.get('/stream', authenticate, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const farmerId = req.user.role === 'farmer' ? req.userId : null;

  // Send initial data
  try {
    const query = farmerId ? { farmerId } : {};
    const latestData = await SensorData.findOne(query).sort({ timestamp: -1 });
    
    if (latestData) {
      res.write(`data: ${JSON.stringify(latestData)}\n\n`);
    }
  } catch (error) {
    console.error('Error in SSE:', error);
  }

  // Send updates every 5 seconds
  const intervalId = setInterval(async () => {
    try {
      const query = farmerId ? { farmerId } : {};
      const latestData = await SensorData.findOne(query).sort({ timestamp: -1 });
      
      if (latestData) {
        res.write(`data: ${JSON.stringify(latestData)}\n\n`);
      }
    } catch (error) {
      console.error('Error in SSE interval:', error);
    }
  }, 5000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

// Get sensor statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const farmerId = req.user.role === 'farmer' ? req.userId : null;
    
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const query = {
      timestamp: { $gte: timeAgo }
    };
    
    if (farmerId) {
      query.farmerId = farmerId;
    }

    const stats = await SensorData.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgTemp: { $avg: '$temperature' },
          maxTemp: { $max: '$temperature' },
          minTemp: { $min: '$temperature' },
          avgHumidity: { $avg: '$humidity' },
          maxHumidity: { $max: '$humidity' },
          minHumidity: { $min: '$humidity' },
          avgSoilMoisture: { $avg: '$soilMoisture' },
          maxSoilMoisture: { $max: '$soilMoisture' },
          minSoilMoisture: { $min: '$soilMoisture' },
          avgPH: { $avg: '$pH' },
          maxPH: { $max: '$pH' },
          minPH: { $min: '$pH' }
        }
      }
    ]);

    res.json({ 
      stats: stats[0] || {},
      hours: parseInt(hours)
    });
  } catch (error) {
    console.error('Error fetching sensor stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get aggregated sensor data
router.get('/aggregated', authenticate, async (req, res) => {
  try {
    const { period = 'hourly', limit = 10 } = req.query;
    const farmerId = req.user.role === 'farmer' ? req.user.id : null;
    
    const query = { aggregationPeriod: period };
    if (farmerId) query.farmerId = farmerId;
    
    const aggregatedData = await AggregatedSensorData.find(query)
      .sort({ endTime: -1 })
      .limit(parseInt(limit));
    
    res.json({ 
      data: aggregatedData,
      count: aggregatedData.length,
      period
    });
  } catch (error) {
    console.error('Error fetching aggregated data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get latest aggregation
router.get('/aggregated/latest', authenticate, async (req, res) => {
  try {
    const { period = 'hourly' } = req.query;
    const farmerId = req.user.role === 'farmer' ? req.user.id : null;
    
    const latest = await getLatestAggregation(farmerId, period);
    
    if (!latest) {
      return res.status(404).json({ 
        error: 'No aggregated data available',
        message: 'Aggregation will be created automatically with sensor data'
      });
    }
    
    res.json({ data: latest });
  } catch (error) {
    console.error('Error fetching latest aggregation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create manual aggregation
router.post('/aggregate', authenticate, async (req, res) => {
  try {
    const { hours = 24, period = 'hourly' } = req.body;
    const farmerId = req.user.role === 'farmer' ? req.user.id : null;
    
    console.log(`\n📊 [Manual Aggregation] Creating ${period} aggregation for ${hours} hours...`);
    
    const aggregates = await aggregateSensorData({ 
      farmerId, 
      hours: parseInt(hours), 
      aggregationPeriod: period 
    });
    
    if (!aggregates) {
      return res.status(404).json({ 
        error: 'No sensor data available',
        message: `Need at least some sensor readings from the last ${hours} hours`
      });
    }
    
    const saved = await storeAggregatedData(aggregates);
    
    res.json({ 
      message: 'Aggregation created successfully',
      data: saved
    });
  } catch (error) {
    console.error('Error creating aggregation:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Compare current reading with aggregated data
router.post('/compare', authenticate, async (req, res) => {
  try {
    const { temperature, humidity, soilMoisture, pH, rainfall = 0 } = req.body;
    const farmerId = req.user.role === 'farmer' ? req.user.id : null;
    
    if (!temperature || !humidity || !soilMoisture || !pH) {
      return res.status(400).json({ 
        error: 'Missing required fields: temperature, humidity, soilMoisture, pH' 
      });
    }
    
    const realtimeReading = { temperature, humidity, soilMoisture, pH, rainfall };
    const comparison = await compareAggregatedWithRealtime(realtimeReading, farmerId);
    
    res.json(comparison);
  } catch (error) {
    console.error('Error comparing sensor data:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;
