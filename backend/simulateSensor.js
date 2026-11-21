import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001/api/sensors/data';
const DEVICE_TOKEN = process.env.IOT_DEVICE_SECRET || 'krishi_sakha_device_secret_2026';
const INTERVAL_MS = 5000;

console.log('🌾 Krishi Sakha Sensor Simulator Started');
console.log(`📡 Target endpoint: ${BACKEND_URL}`);
console.log(`⏱️ Transmission interval: ${INTERVAL_MS / 1000}s\n`);

let packetNum = 1;

async function sendSensorReading() {
  try {
    // Generate realistic agricultural variations
    const baseTemp = 26.5;
    const baseHumidity = 54.0;
    const baseSoil = 42.0;

    const tempJitter = (Math.random() - 0.5) * 1.5;
    const humJitter = (Math.random() - 0.5) * 3.0;
    const soilJitter = (Math.random() - 0.5) * 2.0;

    const payload = {
      temperature: parseFloat((baseTemp + tempJitter).toFixed(1)),
      humidity: parseFloat((baseHumidity + humJitter).toFixed(1)),
      soilMoisture: parseFloat((baseSoil + soilJitter).toFixed(1)),
      pH: 6.8,
      rainLevel: 0,
      rainfall: 0,
      nitrogen: 45,
      phosphorus: 38,
      potassium: 42,
      soilRaw: Math.floor(3380 + Math.random() * 40),
      rssi: Math.floor(-75 + (Math.random() - 0.5) * 8),
      packetNum: packetNum++,
      deviceId: 'ESP32_SENSOR_001',
      source: 'esp32-wifi',
      deviceToken: DEVICE_TOKEN
    };

    const res = await axios.post(BACKEND_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': DEVICE_TOKEN
      },
      timeout: 3000
    });

    console.log(`[#${packetNum - 1}] ✅ Sent: ${payload.temperature}°C | Hum: ${payload.humidity}% | Soil: ${payload.soilMoisture}% -> Status: ${res.status}`);
  } catch (err) {
    console.error(`[#${packetNum}] ❌ Failed:`, err.message);
  }
}

// Initial send immediately
sendSensorReading();

// Periodic send every 5s
setInterval(sendSensorReading, INTERVAL_MS);
