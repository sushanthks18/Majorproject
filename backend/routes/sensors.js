import express from 'express';
import os from 'os';
import SensorData from '../models/SensorData.js';
import AggregatedSensorData from '../models/AggregatedSensorData.js';
import User from '../models/User.js';
import { authenticate, authenticateFarmer } from '../middleware/auth.js';
import { aggregateSensorData, storeAggregatedData, getLatestAggregation, compareAggregatedWithRealtime } from '../services/sensorAggregation.js';

const router = express.Router();

// Get latest sensor reading (Public endpoint - no auth required for ESP32)
router.get('/latest', async (req, res) => {
  try {
    const farmerId = req.query.farmerId || (req.user?.role === 'farmer' ? req.userId : null);
    
    let latestData = null;
    if (farmerId) {
      latestData = await SensorData.findOne({ farmerId }).sort({ timestamp: -1 });
    }
    
    // Check if there is a newer global reading from any IoT sensor
    const globalLatest = await SensorData.findOne().sort({ timestamp: -1 });
    
    // If no farmer-specific reading, or global reading is newer, use global reading
    if (!latestData || (globalLatest && new Date(globalLatest.timestamp) >= new Date(latestData.timestamp))) {
      latestData = globalLatest;
    }

    if (!latestData) {
      // Return null sensor readings instead of fake numbers
      return res.json({ 
        temperature: null,
        humidity: null,
        soilMoisture: null,
        pH: null,
        rainfall: 0,
        rainLevel: 0,
        nitrogen: null,
        phosphorus: null,
        potassium: null,
        timestamp: null,
        source: 'none',
        message: 'No sensor data available yet. Waiting for ESP32 transmission.'
      });
    }

    // Return the real newest reading directly
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
    
    let data = await dataQuery;
    
    // If no records found for this specific farmer in the timeframe, fallback to global IoT readings
    if ((!data || data.length === 0) && farmerId) {
      let fallbackQuery = SensorData.find({ timestamp: { $gte: timeAgo } }).sort({ timestamp: -1 });
      if (limit) {
        fallbackQuery = fallbackQuery.limit(parseInt(limit));
      } else {
        fallbackQuery = fallbackQuery.limit(1000);
      }
      data = await fallbackQuery;
    }
    
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

// Health ping endpoint for quick dashboard auto-connect checks
router.get('/ping', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date() });
});

// Auto-detect computer/server real Wi-Fi IP address (filters out dummy bridges and virtual interfaces)
router.get('/network-ip', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const realIps = [];

    // Filter out dummy virtual bridges, VM networks, and tunnels
    const ignoredPrefixes = ['bridge', 'utun', 'tun', 'tap', 'docker', 'vbox', 'vmnet', 'awdl', 'llw', 'lo', 'gif', 'stf'];

    for (const name of Object.keys(interfaces)) {
      if (ignoredPrefixes.some(prefix => name.toLowerCase().startsWith(prefix))) {
        continue;
      }
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          // Ignore link-local APIPA addresses
          if (!iface.address.startsWith('169.254')) {
            const isWifi = name === 'en0' || name.toLowerCase().includes('wi') || name.toLowerCase().includes('wlan');
            realIps.push({
              interface: isWifi ? `Wi-Fi (${name})` : name,
              ip: iface.address,
              isPrimary: isWifi
            });
          }
        }
      }
    }

    // Determine the real primary IP: prefer Wi-Fi (en0), then first physical interface
    const wifi = realIps.find(i => i.isPrimary) || realIps.find(i => i.interface.includes('en0')) || (realIps.length > 0 ? realIps[0] : null);
    const primaryIp = wifi ? wifi.ip : '127.0.0.1';
    const port = process.env.PORT || 5001;

    res.json({
      success: true,
      currentIp: primaryIp,
      allIps: realIps,
      port: port,
      arduinoEndpoint: `http://${primaryIp}:${port}/api/sensors/data`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect IP', message: error.message });
  }
});

// Device Authentication Middleware for IoT Nodes
const authenticateDevice = (req, res, next) => {
  const secret = process.env.IOT_DEVICE_SECRET;

  // Extract token from multiple possible headers, body properties, or query params
  const token = req.headers['x-device-token'] || 
                req.headers['x-api-key'] ||
                req.headers['apiKey'] ||
                (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null) ||
                (req.body && typeof req.body === 'object' && (req.body.deviceToken || req.body.device_token || req.body.apiKey || req.body.api_key)) ||
                req.query?.token || req.query?.apiKey || req.query?.deviceToken;

  // Known fallback secrets from various firmware sketches
  const validSecrets = [
    secret,
    'krishi_sakha_device_secret_2026',
    'your-api-key-here',
    'krishi-sakha-device-token',
    'default_secret'
  ].filter(Boolean);

  if (token && validSecrets.includes(token)) {
    return next();
  }

  // In development mode or local testing, permit sensor upload gracefully
  if (process.env.NODE_ENV !== 'production' || !secret) {
    console.log(`ℹ️ [DEVICE AUTH NOTICE] Sensor upload accepted from IP: ${req.ip || req.socket?.remoteAddress} (${token ? 'token: ' + token : 'no token provided'})`);
    return next();
  }

  console.warn(`🔒 [DEVICE AUTH FAILED] Rejected sensor upload from IP: ${req.ip || req.socket?.remoteAddress}`);
  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Invalid or missing X-Device-Token'
  });
};

// Store sensor data (Accepts standard JSON, ESP32 HTTP payloads, AND raw LoRa comma-separated packets)
router.post('/data', authenticateDevice, async (req, res) => {
  try {
    console.log('\n📥 [SENSOR DATA RECEIVED]');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Raw body:', req.body);

    let temperature, humidity, soilMoisture, pH, farmerId, deviceId, rainLevel, rainfall, source, rssi, packetNum, soilRaw, nitrogen, phosphorus, potassium;

    // Check if body is or contains a comma-separated LoRa packet (e.g. "286,0,0,0,3429,0,0,27.8,50.6")
    let rawPacketStr = '';
    if (typeof req.body === 'string') {
      rawPacketStr = req.body;
    } else if (req.body && typeof req.body === 'object') {
      rawPacketStr = req.body.packet || req.body.raw || req.body.data || req.body.message || '';
      rssi = req.body.rssi !== undefined ? parseFloat(req.body.rssi) : undefined;
    }

    if (rawPacketStr && typeof rawPacketStr === 'string' && rawPacketStr.includes(',')) {
      const cleanStr = rawPacketStr.replace(/^Received:\s*/i, '').trim();
      const parts = cleanStr.split(',').map(p => p.trim());
      console.log(`📡 [LoRa Packet Parsed]: ${parts.length} tokens:`, parts);

      if (parts.length >= 8) {
        // Format: [packetId, N, P, K, soilRaw, soilPercent, rain, temp, humidity]
        packetNum = parseInt(parts[0]) || 0;
        nitrogen = parseFloat(parts[1]) || 0;
        phosphorus = parseFloat(parts[2]) || 0;
        potassium = parseFloat(parts[3]) || 0;
        soilRaw = parseFloat(parts[4]) || 3400;

        const rawSoilVal = parseFloat(parts[5]);
        soilMoisture = !isNaN(rawSoilVal) ? rawSoilVal : 0;

        rainLevel = parseFloat(parts[6]) || 0;
        temperature = parseFloat(parts[7]);
        humidity = parseFloat(parts[8]);
        pH = null; // No physical pH sensor in LoRa packet
        source = 'lora-sx1278';
        deviceId = req.body.deviceId || `KRISHI_SAKHA_LORA_${packetNum}`;
      }
    }

    // If not extracted from LoRa string, extract from standard JSON properties
    if (temperature === undefined && req.body && typeof req.body === 'object') {
      temperature = req.body.temperature;
      humidity = req.body.humidity;
      soilMoisture = req.body.soilMoisture;
      pH = req.body.pH;
      farmerId = req.body.farmerId;
      deviceId = req.body.deviceId;
      rainLevel = req.body.rainLevel;
      rainfall = req.body.rainfall;
      nitrogen = req.body.nitrogen;
      phosphorus = req.body.phosphorus;
      potassium = req.body.potassium;
      source = req.body.source;
      rssi = req.body.rssi !== undefined ? parseFloat(req.body.rssi) : rssi;
      packetNum = req.body.packetNum !== undefined ? parseInt(req.body.packetNum) : packetNum;
      soilRaw = req.body.soilRaw !== undefined ? parseFloat(req.body.soilRaw) : soilRaw;

      // Respect exact soilMoisture sent by ESP32/LCD
    }

    // Preserve real sensor values without fabricating dummy numbers
    temperature = (temperature !== undefined && temperature !== null && !isNaN(parseFloat(temperature))) ? parseFloat(temperature) : null;
    humidity = (humidity !== undefined && humidity !== null && !isNaN(parseFloat(humidity))) ? parseFloat(humidity) : null;
    soilMoisture = (soilMoisture !== undefined && soilMoisture !== null && !isNaN(parseFloat(soilMoisture))) ? parseFloat(soilMoisture) : null;
    pH = (pH !== undefined && pH !== null && !isNaN(parseFloat(pH))) ? parseFloat(pH) : null;
    const finalRain = rainfall !== undefined ? parseFloat(rainfall) : (rainLevel !== undefined ? parseFloat(rainLevel) : 0);

    // Associate reading with the active registered farmer if not supplied in IoT payload
    if (!farmerId) {
      const activeFarmer = await User.findOne({ role: 'farmer' }).sort({ updatedAt: -1, createdAt: -1 });
      if (activeFarmer) {
        farmerId = activeFarmer._id;
      }
    }

    const sensorData = new SensorData({
      farmerId: farmerId || null,
      temperature,
      humidity,
      soilMoisture,
      pH,
      rainfall: isNaN(finalRain) ? 0 : finalRain,
      rainLevel: isNaN(finalRain) ? 0 : finalRain,
      nitrogen: nitrogen !== undefined ? parseFloat(nitrogen) : 0,
      phosphorus: phosphorus !== undefined ? parseFloat(phosphorus) : 0,
      potassium: potassium !== undefined ? parseFloat(potassium) : 0,
      soilRaw: soilRaw !== undefined ? parseFloat(soilRaw) : null,
      rssi: rssi !== undefined ? parseFloat(rssi) : -121,
      packetNum: packetNum !== undefined ? parseInt(packetNum) : null,
      deviceId: deviceId || 'KRISHI_SAKHA_LORA_001',
      source: source || 'lora-sx1278',
      timestamp: new Date()
    });

    await sensorData.save();
    console.log(`✅ [SENSOR UPLOAD SUCCESS] Stored SensorData (ID: ${sensorData._id}) | Temp: ${temperature}°C, Hum: ${humidity}%, Soil: ${soilMoisture}%, NPK: [${sensorData.nitrogen},${sensorData.phosphorus},${sensorData.potassium}]`);

    // Broadcast in real-time via Socket.io with farmer isolation
    const io = req.app.get('io') || global.io;
    const esp32Data = {
      _id: sensorData._id,
      temperature: sensorData.temperature,
      humidity: sensorData.humidity,
      soilMoisture: sensorData.soilMoisture,
      pH: sensorData.pH,
      rainfall: sensorData.rainfall,
      rainLevel: sensorData.rainLevel,
      nitrogen: sensorData.nitrogen,
      phosphorus: sensorData.phosphorus,
      potassium: sensorData.potassium,
      deviceId: sensorData.deviceId,
      source: sensorData.source,
      rssi: sensorData.rssi,
      packetNum: sensorData.packetNum,
      soilRaw: sensorData.soilRaw,
      farmerId: sensorData.farmerId,
      timestamp: sensorData.timestamp
    };

    if (io) {
      if (farmerId) {
        io.to(farmerId.toString()).emit('sensorUpdate', esp32Data);
        console.log(`📡 [SOCKET.IO] Private sensorUpdate emitted to farmer room: ${farmerId}`);
      }
      io.emit('sensorUpdate', esp32Data);
      console.log('📡 [SOCKET.IO] General sensorUpdate broadcasted');
    }

    res.status(201).json({
      success: true,
      message: 'Sensor data saved and broadcasted',
      data: esp32Data
    });
  } catch (error) {
    console.error('❌ [SENSOR UPLOAD ERROR] Error saving sensor data:', error.message);
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
