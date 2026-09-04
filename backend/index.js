import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { startNotificationScheduler } from './utils/notificationService.js';
import { syncPriorityData } from './sync_gov_data.js';
import { autoAggregateHourly } from './services/sensorAggregation.js';

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
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for IoT devices
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible globally for notifications
global.io = io;
app.set('io', io);

// MongoDB connection - For demo purposes
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-agriculture';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 3000,
  socketTimeoutMS: 10000,
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch(err => {
    console.warn('⚠️  MongoDB not available - App will work with limited features');
    console.log('💡 Signup/Login will work, but data won\'t persist after restart');
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