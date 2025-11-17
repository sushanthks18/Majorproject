# Live Sensor Data Integration Guide

## 📡 Overview

Your Smart Agriculture System now supports **real-time live sensor data** from IoT devices including Arduino, ESP32, ESP8266, Raspberry Pi, and other hardware sensors.

---

## 🚀 Quick Start

### Option 1: Test with Simulator (JavaScript)

```bash
cd backend
npm run sensor-sim
```

This will send simulated sensor data every 5 seconds.

### Option 2: Test with Python Script

```bash
cd backend
python3 iot_sensor_client.py
```

### Option 3: Use Arduino/ESP32

Upload `arduino_sensor_client.ino` to your ESP32/ESP8266 board.

---

## 📋 API Endpoint

### POST `/api/sensors/data`

**Public endpoint** - No authentication required for IoT devices.

**URL**: `http://localhost:5001/api/sensors/data`

**Method**: `POST`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "temperature": 28.5,
  "humidity": 65.2,
  "soilMoisture": 45.8,
  "pH": 6.8,
  "farmerId": "optional_farmer_id",
  "deviceId": "SENSOR_001",
  "apiKey": "optional_api_key"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Sensor data saved",
  "data": {
    "_id": "...",
    "temperature": 28.5,
    "humidity": 65.2,
    "soilMoisture": 45.8,
    "pH": 6.8,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 🔄 Real-time Updates

Data is automatically broadcasted to all connected web clients via **Socket.io**.

**Events**:
- `sensorUpdate` - Broadcasted to all users
- `sensorUpdate` (room) - Sent to specific farmer if `farmerId` provided

---

## 🔧 Integration Methods

### 1. **JavaScript/Node.js** (simulateSensor.js)
```bash
npm run sensor-sim
```

### 2. **Python** (iot_sensor_client.py)
```python
pip install requests
python3 iot_sensor_client.py
```

**Customize**:
- Set `BACKEND_URL` to your server address
- Replace sensor reading functions with actual hardware code
- Adjust `INTERVAL_SECONDS` as needed

### 3. **Arduino/ESP32** (arduino_sensor_client.ino)

**Required Libraries**:
```
WiFi (built-in)
HTTPClient (built-in)
ArduinoJson
DHT sensor library
```

**Install via Arduino IDE**:
1. Tools → Manage Libraries
2. Search and install: `ArduinoJson`, `DHT sensor library`

**Configuration**:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_SERVER_IP:5001/api/sensors/data";
```

**Upload**:
1. Open `arduino_sensor_client.ino` in Arduino IDE
2. Select board: ESP32 Dev Module / NodeMCU
3. Upload to your board

---

## 🌐 Production Deployment

### Update Backend URL

**JavaScript**:
```javascript
const BACKEND_URL = 'https://your-domain.com';
```

**Python**:
```python
BACKEND_URL = "https://your-domain.com/api/sensors/data"
```

**Arduino**:
```cpp
const char* serverUrl = "https://your-domain.com/api/sensors/data";
```

### Enable HTTPS (Recommended)

For production, use HTTPS with SSL certificates.

---

## 🔒 Security (Optional)

Add API key validation in `/backend/routes/sensors.js`:

```javascript
// Uncomment this section in sensors.js
if (apiKey !== process.env.SENSOR_API_KEY) {
  return res.status(401).json({ error: 'Invalid API key' });
}
```

Add to `.env`:
```
SENSOR_API_KEY=your-secure-api-key-here
```

Update your device code to include the API key.

---

## 📊 Viewing Live Data

### On Dashboard

Data automatically updates every 5 seconds via Socket.io:
1. Login as farmer: `http://localhost:5173`
2. View Dashboard
3. Sensor cards update in real-time

### Via API

```bash
# Get latest reading
curl http://localhost:5001/api/sensors/latest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get historical data (last 24 hours)
curl http://localhost:5001/api/sensors/history?hours=24 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get statistics
curl http://localhost:5001/api/sensors/stats?hours=24 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🛠️ Hardware Setup Examples

### DHT22 (Temperature & Humidity)
```
DHT22 → ESP32
VCC   → 3.3V
DATA  → GPIO 4
GND   → GND
```

### Capacitive Soil Moisture Sensor
```
Sensor → ESP32
VCC    → 3.3V
AOUT   → GPIO 34
GND    → GND
```

### pH Sensor
```
pH Sensor → ESP32
VCC       → 5V
AOUT      → GPIO 35
GND       → GND
```

---

## 🧪 Testing

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Start Sensor Simulator
```bash
# In a new terminal
cd backend
npm run sensor-sim
```

### 3. View in Browser
```
http://localhost:5173
```

Login and watch sensor values update in real-time!

---

## 📝 Troubleshooting

### Issue: "Connection refused"
- ✅ Ensure backend is running on port 5001
- ✅ Check firewall settings
- ✅ Verify BACKEND_URL is correct

### Issue: "CORS error"
- ✅ Backend already configured to allow all origins
- ✅ Check network connectivity

### Issue: "Invalid sensor data"
- ✅ Ensure all fields are present: temperature, humidity, soilMoisture, pH
- ✅ Values must be numbers, not strings

### Issue: "WiFi not connecting" (Arduino)
- ✅ Check SSID and password
- ✅ Ensure 2.4GHz WiFi (ESP32/ESP8266 don't support 5GHz)
- ✅ Move device closer to router

---

## 🎯 Next Steps

1. ✅ Test with simulator: `npm run sensor-sim`
2. ✅ Connect real hardware sensors
3. ✅ Calibrate sensor readings
4. ✅ Deploy to production server
5. ✅ Set up SSL certificates
6. ✅ Enable API key authentication

---

## 📞 Support

For issues or questions:
1. Check sensor wiring
2. Verify backend is running
3. Check browser console for errors
4. Check backend logs for connection issues

**Your live sensor integration is ready!** 🌾📡
