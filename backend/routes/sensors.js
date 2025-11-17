import express from 'express';
import SensorData from '../models/SensorData.js';
import { authenticate, authenticateFarmer } from '../middleware/auth.js';

const router = express.Router();

// Get latest sensor reading
router.get('/latest', authenticate, async (req, res) => {
  try {
    const farmerId = req.user.role === 'farmer' ? req.userId : null;
    
    const query = farmerId ? { farmerId } : {};
    const latestData = await SensorData.findOne(query).sort({ timestamp: -1 });

    if (!latestData) {
      // Return default/simulated data instead of 404
      return res.json({ 
        data: {
          temperature: 25,
          humidity: 60,
          soilMoisture: 45,
          pH: 7.0,
          rainLevel: 0,
          timestamp: new Date(),
          _id: null
        },
        message: 'No sensor data available. Showing default values.'
      });
    }

    res.json({ data: latestData });
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get historical data
router.get('/history', authenticate, async (req, res) => {
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

    const data = await SensorData.find(query)
      .sort({ timestamp: 1 })
      .limit(1000);

    res.json({ 
      data,
      count: data.length,
      hours: parseInt(hours)
    });
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Store sensor data (Public endpoint for IoT devices - ESP32 compatible)
router.post('/data', async (req, res) => {
  try {
    let { temperature, humidity, soilMoisture, pH, farmerId, deviceId, apiKey, rainLevel } = req.body;

    // Handle ESP32 format (rainLevel instead of pH if pH not provided)
    if (!pH && rainLevel !== undefined) {
      // If pH is missing but rainLevel exists, use default pH
      pH = 7.0; // Default pH value
    }

    // Basic validation
    if (temperature === undefined || humidity === undefined || soilMoisture === undefined) {
      return res.status(400).json({ error: 'Missing required sensor data fields (temperature, humidity, soilMoisture)' });
    }

    // Convert to numbers
    temperature = parseFloat(temperature);
    humidity = parseFloat(humidity);
    soilMoisture = parseFloat(soilMoisture);
    pH = parseFloat(pH || 7.0);

    // Optional: Validate API key for security
    // if (apiKey !== process.env.SENSOR_API_KEY) {
    //   return res.status(401).json({ error: 'Invalid API key' });
    // }

    const sensorData = new SensorData({
      temperature,
      humidity,
      soilMoisture,
      pH,
      rainLevel: parseFloat(rainLevel || 0),
      farmerId: farmerId || null,
      timestamp: new Date()
    });

    await sensorData.save();

    // Emit to connected clients via Socket.io
    const io = req.app.get('io') || global.io;
    if (io) {
      // Create ESP32-tagged data for frontend
      const esp32Data = {
        ...sensorData.toObject(),
        deviceId: deviceId || 'ESP32_001',
        source: req.body.source || 'krishi-sakha'
      };
      
      // Broadcast to all connected clients
      io.emit('sensorUpdate', esp32Data);
      
      // Send to specific farmer if farmerId provided
      if (farmerId) {
        io.to(farmerId).emit('sensorUpdate', esp32Data);
      }
      
      console.log(`✅ [ESP32 DATA] Temp: ${temperature}°C, Humidity: ${humidity}%, Soil: ${soilMoisture}%, pH: ${pH}, Rain: ${rainLevel || 0}%`);
      console.log(`📡 Broadcasting to frontend with deviceId: ${deviceId || 'ESP32_001'}`);
    }

    res.status(201).json({ 
      success: true,
      message: 'Sensor data saved',
      data: sensorData,
      received_data: req.body // Echo back for ESP32 confirmation
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

export default router;
