import axios from 'axios';

// Configuration
const BACKEND_URL = 'http://localhost:5001';
const FARMER_ID = null; // Set to specific farmer ID or leave null for all farmers
const INTERVAL_MS = 5000; // Send data every 5 seconds

// Generate realistic sensor readings
const generateSensorData = () => {
  const baseTemp = 25;
  const baseHumidity = 65;
  const baseSoilMoisture = 45;
  const basePH = 6.5;

  return {
    temperature: +(baseTemp + (Math.random() - 0.5) * 10).toFixed(2),
    humidity: +(baseHumidity + (Math.random() - 0.5) * 20).toFixed(2),
    soilMoisture: +(baseSoilMoisture + (Math.random() - 0.5) * 30).toFixed(2),
    pH: +(basePH + (Math.random() - 0.5) * 2).toFixed(2),
    farmerId: FARMER_ID,
    deviceId: 'SENSOR_001',
    apiKey: 'your-api-key-here' // Optional
  };
};

// Send sensor data to backend
const sendSensorData = async () => {
  try {
    const data = generateSensorData();
    const response = await axios.post(`${BACKEND_URL}/api/sensors/data`, data);
    
    console.log(`✅ [${new Date().toLocaleTimeString()}] Sensor data sent:`);
    console.log(`   Temperature: ${data.temperature}°C`);
    console.log(`   Humidity: ${data.humidity}%`);
    console.log(`   Soil Moisture: ${data.soilMoisture}%`);
    console.log(`   pH: ${data.pH}`);
    console.log('-----------------------------------');
  } catch (error) {
    console.error('❌ Error sending sensor data:', error.message);
  }
};

// Start simulation
console.log('🌾 Smart Agriculture - Live Sensor Simulator');
console.log('===========================================');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`Update Interval: ${INTERVAL_MS}ms`);
console.log('===========================================\n');

// Send initial data
sendSensorData();

// Send data at regular intervals
setInterval(sendSensorData, INTERVAL_MS);
