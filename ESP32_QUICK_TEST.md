# 🚀 ESP32 LIVE DATA - QUICK VERIFICATION

## ✅ Your ESP32 Configuration
```cpp
const char* ssid = "ABCDE";
const char* password = "123456789";
const char* serverUrl = "http://10.116.189.241:5001/api/sensors/data";
const char* deviceId = "ESP32_SENSOR_001";
const char* apiKey = "krishi-sakha-esp32";
```

## 🔍 VERIFY ESP32 IS SENDING DATA

### Step 1: Check Backend Logs
Your backend should show these messages every 5 seconds if ESP32 is working:

```
📥 [SENSOR DATA RECEIVED]
Raw data: { temperature: 28.5, humidity: 72.3, ... }
✅ Validated data: { ... }
💾 Saved to database with ID: ...
📡 Broadcasting to frontend: { ... }
✅ [ESP32 DATA] Temp: 28.5°C, Humidity: 72.3%, Soil: 65.8%, pH: 6.5, Rain: 12%
📡 Broadcasted with deviceId: ESP32_SENSOR_001, source: krishi-sakha
```

**If you DON'T see these messages**, your ESP32 is NOT sending data!

### Step 2: Check ESP32 Serial Monitor
Open Arduino IDE Serial Monitor (115200 baud). You should see:

```
✅ WiFi Connected! IP: 192.168.x.x
📡 Sending to: http://10.116.189.241:5001/api/sensors/data
📊 Data: {"temperature":28.5,"humidity":72.3,...}
✅ HTTP Response Code: 201
✅ Data sent successfully!
```

**If you see `❌ Error: -1` or connection timeout**, ESP32 can't reach your server!

---

## 🛠️ TROUBLESHOOTING

### Problem 1: ESP32 Not Connecting to WiFi
**Symptoms**: Serial Monitor shows "WiFi connecting..." forever

**Solution**:
1. Verify SSID is correct: `"ABCDE"`
2. Verify password is correct: `"123456789"`
3. Check WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
4. Move ESP32 closer to router

### Problem 2: ESP32 Can't Reach Server
**Symptoms**: WiFi connected but HTTP error -1 or timeout

**Solution**:
1. **Verify your IP address is correct!**
   ```bash
   # On Mac (your system):
   ipconfig getifaddr en0
   
   # On Windows:
   ipconfig
   
   # Look for: IPv4 Address
   ```

2. **CRITICAL**: Your server IP might have changed!
   - Current ESP32 config: `10.116.189.241`
   - Run command above to verify
   - If different, update ESP32 code and re-upload

3. **Test from ESP32's perspective**:
   ```bash
   # Ping from your computer to verify network
   ping 10.116.189.241
   ```

4. **Firewall blocking?**
   - Temporarily disable firewall
   - Or allow port 5001

### Problem 3: Backend Not Receiving Data
**Symptoms**: ESP32 sends (HTTP 200/201) but backend logs nothing

**Solution**: Backend not running or wrong port
```bash
# Check if backend is running on port 5001
lsof -ti:5001

# If nothing, start backend:
cd /Users/sushanthks/Developer/FINALMINIPROJECT/phase3first/backend
npm run dev
```

### Problem 4: Dashboard Shows Dummy Data
**Symptoms**: Backend receives data, but dashboard doesn't update

**Solution**: WebSocket not connected
1. Open browser console (F12)
2. Look for: `🔌 Setting up WebSocket listeners...`
3. Look for: `📡 Received sensor update: {...}`
4. If missing, refresh page

---

## 🧪 TEST WITHOUT ESP32

**Simulate ESP32 to verify system works**:

```bash
# Run this from your computer
curl -X POST http://localhost:5001/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 28.5,
    "humidity": 72.3,
    "soilMoisture": 65.8,
    "pH": 6.5,
    "rainfall": 12.0,
    "deviceId": "ESP32_SENSOR_001",
    "source": "krishi-sakha"
  }'
```

**Expected Result**:
- Backend logs show sensor data received
- Dashboard updates immediately
- Green "ESP32 Connected" badge appears
- Toast notification shows values

**If this works but ESP32 doesn't**, the problem is ESP32 → Server connection!

---

## ✅ COMPLETE ESP32 ARDUINO CODE

Here's the COMPLETE code your ESP32 needs:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "ABCDE";
const char* password = "123456789";

// Server Configuration
const char* serverUrl = "http://10.116.189.241:5001/api/sensors/data";
const char* deviceId = "ESP32_SENSOR_001";
const char* apiKey = "krishi-sakha-esp32";

// Sensor Pin Configuration
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define SOIL_PIN 34
#define PH_PIN 35
#define RAIN_PIN 32

// Timing
const unsigned long SEND_INTERVAL = 5000;  // 5 seconds
unsigned long lastSendTime = 0;

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n🌿 Krishi Sakha - ESP32 Sensor Client");
  Serial.println("=====================================");
  
  // Initialize sensors
  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  
  // Connect to WiFi
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("📍 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📡 Sending to: ");
    Serial.println(serverUrl);
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    Serial.println("⚠️  Please check SSID and password");
  }
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnected! Reconnecting...");
    WiFi.begin(ssid, password);
    delay(5000);
    return;
  }
  
  // Send data every SEND_INTERVAL
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    sendSensorData();
  }
}

void sendSensorData() {
  // Read sensors
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  int soilRaw = analogRead(SOIL_PIN);
  int phRaw = analogRead(PH_PIN);
  int rainRaw = analogRead(RAIN_PIN);
  
  // Convert to percentages/values
  float soilMoisture = map(soilRaw, 4095, 0, 0, 100);  // Invert for capacitive sensor
  soilMoisture = constrain(soilMoisture, 0, 100);
  
  float pH = map(phRaw, 0, 4095, 0, 14);  // Map to pH range 0-14
  
  float rainfall = map(rainRaw, 4095, 0, 0, 100);  // Invert (dry = 4095, wet = 0)
  rainfall = constrain(rainfall, 0, 100);
  
  // Check if DHT reading failed
  if (isnan(temp) || isnan(humidity)) {
    Serial.println("❌ Failed to read from DHT sensor!");
    temp = 25.0;      // Default values
    humidity = 60.0;
  }
  
  // Print sensor readings
  Serial.println("\n📊 Sensor Readings:");
  Serial.println("─────────────────────");
  Serial.printf("🌡️  Temperature: %.1f°C\n", temp);
  Serial.printf("💧 Humidity: %.1f%%\n", humidity);
  Serial.printf("🌱 Soil Moisture: %.1f%% (Raw: %d)\n", soilMoisture, soilRaw);
  Serial.printf("🧪 pH: %.1f (Raw: %d)\n", pH, phRaw);
  Serial.printf("🌧️  Rainfall: %.1f%% (Raw: %d)\n", rainfall, rainRaw);
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["temperature"] = temp;
  doc["humidity"] = humidity;
  doc["soilMoisture"] = soilMoisture;
  doc["pH"] = pH;
  doc["rainfall"] = rainfall;
  doc["deviceId"] = deviceId;
  doc["apiKey"] = apiKey;
  doc["source"] = "krishi-sakha";  // CRITICAL for frontend recognition
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("\n📡 Sending to server...");
  Serial.printf("📍 URL: %s\n", serverUrl);
  Serial.printf("📦 Payload: %s\n", jsonString.c_str());
  
  // Send HTTP POST request
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode == 200 || httpResponseCode == 201) {
    Serial.println("✅ Data sent successfully!");
    String response = http.getString();
    Serial.printf("📨 Server response: %s\n", response.c_str());
  } else if (httpResponseCode > 0) {
    Serial.printf("⚠️  HTTP Error: %d\n", httpResponseCode);
    Serial.printf("Response: %s\n", http.getString().c_str());
  } else {
    Serial.printf("❌ Connection Error: %d\n", httpResponseCode);
    Serial.println("⚠️  Possible causes:");
    Serial.println("   - Server not running");
    Serial.println("   - Wrong IP address");
    Serial.println("   - Firewall blocking port 5001");
  }
  
  http.end();
  Serial.println("─────────────────────\n");
}
```

---

## 📋 REQUIRED ARDUINO LIBRARIES

Install these in Arduino IDE (Tools → Manage Libraries):

1. **DHT sensor library** by Adafruit
2. **Adafruit Unified Sensor**
3. **ArduinoJson** by Benoit Blanchon (version 6.x)

---

## 🎯 FINAL CHECKLIST

Before uploading to ESP32:

- [ ] WiFi SSID is correct: `"ABCDE"`
- [ ] WiFi password is correct: `"123456789"`
- [ ] Server IP is correct (verify with `ipconfig getifaddr en0`)
- [ ] Backend is running (`npm run dev` in backend folder)
- [ ] Frontend is open in browser
- [ ] Libraries are installed
- [ ] Sensors are wired correctly
- [ ] Serial Monitor set to 115200 baud

---

## 🚀 UPLOAD & TEST

1. Upload code to ESP32
2. Open Serial Monitor (115200 baud)
3. Watch for "✅ WiFi Connected!"
4. Watch for "✅ Data sent successfully!"
5. Check backend terminal for sensor data logs
6. Check dashboard for live updates

**If everything is correct, you'll see live data in 5 seconds!**

---

## ❓ STILL NOT WORKING?

Run this diagnostic:

```bash
# 1. Check backend is running
lsof -ti:5001

# 2. Check your IP
ipconfig getifaddr en0

# 3. Test with curl
curl -X POST http://localhost:5001/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{"temperature":28.5,"humidity":72.3,"soilMoisture":65.8,"pH":6.5,"rainfall":12.0,"deviceId":"ESP32_SENSOR_001","source":"krishi-sakha"}'

# 4. Run automated test
bash test_esp32_data.sh
```

If curl works but ESP32 doesn't → **IP address or network issue**
If curl doesn't work → **Backend not running**
