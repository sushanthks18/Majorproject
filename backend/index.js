import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { startNotificationScheduler } from './utils/notificationService.js';
import { syncPriorityData } from './sync_gov_data.js';
import { autoAggregateHourly } from './services/sensorAggregation.js';
import { Bonjour } from 'bonjour-service';
import os from 'os';
import dgram from 'dgram';

// Import routes
import authRoutes from './routes/auth.js';
import sensorRoutes from './routes/sensors.js';
import predictRoutes from './routes/predict.js';
import agentRoutes from './routes/agents.js';
import requestRoutes from './routes/requests.js';
import mandiRoutes from './routes/mandi.js';
import notificationRoutes from './routes/notifications.js';
import weatherRoutes from './routes/weather.js';
import fieldRoutes from './routes/fields.js';
import satelliteRoutes from './routes/satellite.js';
import irrigationRoutes from './routes/irrigation.js';
import assistantRoutes from './routes/assistant.js';
import cropPlanRoutes from './routes/cropPlans.js';
import cropRoutes from './routes/crops.js';
import newsRoutes from './routes/news.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for IoT devices and remote dashboards
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Token', 'x-device-token', 'X-Api-Key', 'x-api-key', 'apiKey'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible globally for notifications
global.io = io;
app.set('io', io);

// MongoDB connection (supports local MongoDB and MongoDB Atlas Cloud)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-agriculture';
const isAtlas = MONGODB_URI.includes('mongodb+srv://');
console.log(`📡 Connecting to MongoDB (${isAtlas ? 'MongoDB Atlas Cloud' : 'Local MongoDB'})...`);

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 15000,
})
  .then(() => {
    console.log(`✅ Connected to MongoDB (${isAtlas ? 'Atlas Cloud' : 'Local'})`);
  })
  .catch(err => {
    console.warn('⚠️  MongoDB not available:', err.message);
    console.log('💡 Demo mode active: data won\'t persist without MongoDB');
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/predict', predictRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/mandi', mandiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/satellite', satelliteRoutes);
app.use('/api/irrigation', irrigationRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/crop-plans', cropPlanRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/news', newsRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Agriculture System API',
    version: '1.0.0',
    status: 'running'
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Join room based on user ID
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined their room`);
  });

  // Handle sensor data broadcast (for testing)
  socket.on('sensorData', (data) => {
    io.emit('sensorUpdate', data);
    console.log('📊 Sensor data broadcasted:', {
      temp: data.temperature,
      humidity: data.humidity,
      soilMoisture: data.soilMoisture,
      pH: data.pH
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

// Schedule periodic sync with government API (once per day)
function schedulePeriodicSync() {
  // Run sync once per day at 2 AM
  setInterval(async () => {
    try {
      console.log('⏰ Scheduled sync: Attempting to sync with Government API...');
      await syncPriorityData();
      console.log('✅ Scheduled sync completed successfully');
    } catch (error) {
      console.error('⏰ Scheduled sync failed:', error.message);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
  
  // Also run sync immediately after startup (but delayed)
  setTimeout(async () => {
    try {
      console.log('🚀 Initial sync: Attempting to sync with Government API...');
      await syncPriorityData();
      console.log('✅ Initial sync completed successfully');
    } catch (error) {
      console.error('🚀 Initial sync failed:', error.message);
    }
  }, 30000); // 30 seconds after startup
}

// Schedule hourly sensor data aggregation
function scheduleHourlyAggregation() {
  // Run aggregation every hour
  setInterval(async () => {
    try {
      console.log('⏰ [SCHEDULER] Running hourly sensor aggregation...');
      await autoAggregateHourly();
      console.log('✅ [SCHEDULER] Hourly aggregation completed');
    } catch (error) {
      console.error('❌ [SCHEDULER] Aggregation failed:', error.message);
    }
  }, 60 * 60 * 1000); // 1 hour
  
  // Also run aggregation immediately after startup
  setTimeout(async () => {
    try {
      console.log('🚀 [STARTUP] Creating initial sensor aggregation...');
      await autoAggregateHourly();
      console.log('✅ [STARTUP] Initial aggregation completed');
    } catch (error) {
      console.error('❌ [STARTUP] Initial aggregation failed:', error.message);
    }
  }, 10000); // 10 seconds after startup
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  
  // Helper to discover primary LAN IP
  const getPrimaryLanIp = () => {
    const nets = os.networkInterfaces();
    if (nets['en0']) {
      for (const net of nets['en0']) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
    for (const [name, addrs] of Object.entries(nets)) {
      if (name.startsWith('bridge') || name.startsWith('utun') || name.startsWith('lo')) continue;
      for (const net of addrs) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
    return '127.0.0.1';
  };

  // 📡 UDP Auto-Discovery Beacon Broadcaster on Port 5002
  let udpBeacon = null;
  try {
    udpBeacon = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    udpBeacon.bind(0, () => {
      udpBeacon.setBroadcast(true);
      console.log('📡 [UDP Beacon] Broadcaster active on port 5002 for automatic ESP32 auto-discovery');
    });

    setInterval(() => {
      const currentIp = getPrimaryLanIp();
      if (currentIp && currentIp !== '127.0.0.1' && udpBeacon) {
        const beaconPayload = Buffer.from(JSON.stringify({
          app: 'krishisakha',
          ip: currentIp,
          port: parseInt(PORT, 10),
          path: '/api/sensors/data'
        }));
        udpBeacon.send(beaconPayload, 0, beaconPayload.length, 5002, '255.255.255.255', (err) => {
          if (err && err.code !== 'EPERM') {
            // benign network drop
          }
        });
      }
    }, 2000);
  } catch (udpErr) {
    console.warn('⚠️ [UDP Beacon] Initialization error:', udpErr.message);
  }

  // mDNS Service Advertisement for ESP32 Receiver Auto-Discovery
  let bonjourInstance = null;
  let lastAdvertisedIp = '127.0.0.1';
  try {
    lastAdvertisedIp = getPrimaryLanIp();
    bonjourInstance = new Bonjour({}, (err) => {
      console.warn('⚠️ [mDNS] Socket event:', err?.message || err);
    });
    bonjourInstance.publish({
      name: 'Krishi Sakha Backend',
      type: 'http',
      port: parseInt(PORT, 10),
      host: 'krishisakha.local',
      txt: {
        path: '/api/sensors/data',
        ip: lastAdvertisedIp,
        app: 'krishisakha',
        version: '2.0.0'
      }
    });
    console.log(`📡 [mDNS] Service advertised: _http._tcp on port ${PORT} ("Krishi Sakha Backend" -> krishisakha.local @ ${lastAdvertisedIp})`);

    // Periodically detect if DHCP IP changed and update advertisement
    setInterval(() => {
      const freshIp = getPrimaryLanIp();
      if (freshIp !== lastAdvertisedIp && freshIp !== '127.0.0.1') {
        console.log(`🔄 [mDNS] LAN IP change detected: ${lastAdvertisedIp} -> ${freshIp}. Updating mDNS advertisement...`);
        lastAdvertisedIp = freshIp;
        if (bonjourInstance) {
          try {
            bonjourInstance.unpublishAll(() => {
              bonjourInstance.publish({
                name: 'Krishi Sakha Backend',
                type: 'http',
                port: parseInt(PORT, 10),
                host: 'krishisakha.local',
                txt: {
                  path: '/api/sensors/data',
                  ip: freshIp,
                  app: 'krishisakha',
                  version: '2.0.0'
                }
              });
              console.log(`📡 [mDNS] Re-advertised _http._tcp on port ${PORT} ("Krishi Sakha Backend" -> krishisakha.local @ ${freshIp})`);
            });
          } catch (updateErr) {
            console.warn('⚠️ [mDNS] Failed to update advertisement:', updateErr.message);
          }
        }
      }
    }, 15000);
  } catch (err) {
    console.warn('⚠️ [mDNS] Could not initialize Bonjour service:', err.message);
  }

  const cleanup = () => {
    if (bonjourInstance) {
      try { bonjourInstance.destroy(); } catch (e) {}
    }
    if (udpBeacon) {
      try { udpBeacon.close(); } catch (e) {}
    }
  };
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });

  // Start notification scheduler after DB connects
  setTimeout(() => {
    if (mongoose.connection.readyState === 1) {
      startNotificationScheduler();
      schedulePeriodicSync();
      scheduleHourlyAggregation(); // ✅ Start hourly sensor aggregation
    }
  }, 5000); // Wait 5 seconds for DB connection
});

export default app;