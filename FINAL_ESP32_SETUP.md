# 🚀 FINAL ESP32 SETUP - LIVE SENSOR DATA

## ✅ YOUR SYSTEM IS READY!

**Backend Status**: ✅ WORKING - Receiving and broadcasting data  
**Frontend Status**: ✅ READY - WebSocket listening for updates  
**Database**: ✅ CONNECTED - Storing sensor data  

---

## 📋 WHAT YOU NEED TO DO NOW

### Step 1: Upload Code to ESP32

1. **Open Arduino IDE**
2. **Open the file**: `ESP32_Complete_Code.ino`
3. **Install Required Libraries** (Tools → Manage Libraries):
   - DHT sensor library (by Adafruit)
   - Adafruit Unified Sensor
   - ArduinoJson (version 6.x)

4. **Select Board** (Tools → Board):
   - ESP32 Dev Module (or your specific ESP32 board)

5. **Select Port** (Tools → Port):
   - Choose the COM port where ESP32 is connected

6. **Upload** (Click Upload button or Ctrl+U)

---

### Step 2: Verify Your IP Address

**CRITICAL**: Your computer's IP might change. Verify before uploading!

```bash
# On Mac (Your System):
ipconfig getifaddr en0

# Expected output: 10.116.189.241 (or similar)
```

**If IP is different**, update this line in `ESP32_Complete_Code.ino`:
```cpp
const char* serverUrl = "http://YOUR_NEW_IP:5001/api/sensors/data";
```

---

### Step 3: Open Serial Monitor

1. After upload, click **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. You should see:

```
🌿 ================================
🌿 Krishi Sakha - ESP32 Sensor Client
🌿 ================================

📡 Initializing sensors...
✅ Sensors initialized

📡 Connecting to WiFi: ABCDE
🔄 ..................
✅ WiFi Connected Successfully!
📍 ESP32 IP Address: 192.168.x.x
📡 Sending data to: http://10.116.189.241:5001/api/sensors/data

🌿 System Ready! Starting sensor readings...
─────────────────────────────────────────────

📊 Reading sensors...
┌─────────────────────────────────────┐
│      LIVE SENSOR READINGS           │
├─────────────────────────────────────┤
│ 🌡️  Temperature:     28.5 °C      │
│ 💧 Humidity:         72.3 %       │
│ 🌱 Soil Moisture:    65.8 %       │
│ 🧪 pH Level:          6.5         │
│ 🌧️  Rainfall:         12.0 %       │
└─────────────────────────────────────┘

📡 Sending data to server...
✅ SUCCESS! Data sent to server
📨 Server Response:
{"success":true,"message":"Sensor data saved and broadcasted",...}
─────────────────────────────────────
✨ Data is now live on your dashboard!
```

---

### Step 4: Check Your Dashboard

1. **Open browser**: http://localhost:5173
2. **Login** as farmer
3. **Dashboard should show**:
   - 🟢 Green "ESP32 Connected" badge
   - 📊 Live sensor values (updating every 5 seconds)
   - 🔔 Toast notification: "🌿 Sensor Update: 28.5°C, 72.3%, 65.8%"

---

## 🎯 TESTING CHECKLIST

### ✅ ESP32 Side:
- [ ] WiFi connected successfully
- [ ] Sensor readings showing in Serial Monitor
- [ ] HTTP Response Code: 200 or 201
- [ ] "✅ Data sent successfully!" message

### ✅ Backend Side:
Look for these logs every 5 seconds:
```
📥 [SENSOR DATA RECEIVED]
✅ Validated data: { temperature: 28.5, ... }
💾 Saved to database with ID: ...
📡 Broadcasting to frontend: { ... }
✅ [ESP32 DATA] Temp: 28.5°C, Humidity: 72.3%, Soil: 65.8%, pH: 6.5, Rain: 12%
📡 Broadcasted with deviceId: ESP32_SENSOR_001, source: krishi-sakha
```

### ✅ Frontend Side:
Open browser console (F12) and look for:
```
🔌 Setting up WebSocket listeners...
📡 Received sensor update: { temperature: 28.5, ... }
✅ Live ESP32 data: { ... }
💚 ESP32 Connected!
```

### ✅ Dashboard:
- [ ] Sensor values match ESP32 readings
- [ ] Values update every 5 seconds
- [ ] Green "ESP32 Connected" badge visible
- [ ] Toast notifications appear on updates

### ✅ Crop Recommendation:
- [ ] Click "Predict Best Crop"
- [ ] Uses live sensor data
- [ ] Console shows: "✅ Using live sensor data for prediction"
- [ ] Recommendation based on current conditions

---

## ❌ TROUBLESHOOTING

### Problem: WiFi Not Connecting

**Symptoms**: Serial Monitor shows "WiFi connecting..." forever

**Solutions**:
1. Verify SSID: `"ABCDE"` is correct
2. Verify password: `"123456789"` is correct
3. Check WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
4. Move ESP32 closer to router
5. Restart router

---

### Problem: HTTP Connection Error (-1)

**Symptoms**: 
```
❌ Connection Error: -1
```

**Solutions**:

1. **Verify IP Address** (Most Common Issue):
   ```bash
   ipconfig getifaddr en0
   ```
   If different from `10.116.189.241`, update ESP32 code!

2. **Check Backend is Running**:
   ```bash
   lsof -ti:5001
   ```
   If empty, start backend:
   ```bash
   cd backend
   npm run dev
   ```

3. **Firewall Blocking**:
   - Temporarily disable firewall
   - Or allow port 5001

4. **Network Isolation**:
   - Ensure both devices on SAME WiFi
   - Some routers isolate WiFi clients
   - Try connecting to 2.4GHz instead of 5GHz

---

### Problem: Dashboard Shows Dummy Data

**Symptoms**: Backend receives data but dashboard doesn't update

**Solutions**:

1. **Refresh Browser Page** (WebSocket might not be connected)

2. **Check Browser Console** (F12):
   - Look for WebSocket errors
   - Look for "📡 Received sensor update"

3. **Verify Source Field**:
   ESP32 must send `"source": "krishi-sakha"` in JSON payload

4. **Check ESP32 Serial Monitor**:
   Verify HTTP response is 200 or 201 (not error)

---

### Problem: No Sensor Readings

**Symptoms**: Serial Monitor shows `NaN` or `0` for all sensors

**Solutions**:

1. **DHT22 Sensor**:
   - Check wiring: VCC → 3.3V, GND → GND, DATA → GPIO 4
   - Add 10kΩ pull-up resistor between DATA and VCC
   - Wait 2 seconds after power-on

2. **Soil Moisture Sensor**:
   - Check wiring: VCC → 3.3V, GND → GND, AOUT → GPIO 34
   - Calibrate: Insert in dry soil, note value
   - Calibrate: Insert in wet soil, note value
   - Update `SOIL_DRY_VALUE` and `SOIL_WET_VALUE`

3. **pH Sensor**:
   - Check wiring: Connect to GPIO 35
   - Requires calibration with pH buffer solutions
   - Default mapping may be inaccurate

4. **Rain Sensor**:
   - Check wiring: Connect to GPIO 32
   - Test: Keep dry → should read ~0%
   - Test: Add water → should increase

---

## 🔧 CALIBRATION (Optional but Recommended)

### Soil Moisture Calibration:

1. **Dry Reading**:
   - Remove sensor from soil
   - Note raw value in Serial Monitor
   - Update: `const int SOIL_DRY_VALUE = YOUR_VALUE;`

2. **Wet Reading**:
   - Submerge sensor in water (don't submerge electronics!)
   - Note raw value
   - Update: `const int SOIL_WET_VALUE = YOUR_VALUE;`

3. **Re-upload code**

### pH Calibration:

1. Get pH 4.0, 7.0, and 10.0 buffer solutions
2. Measure raw values for each
3. Calculate voltage-to-pH mapping
4. Update calibration constants
5. Re-upload code

---

## 🎉 SUCCESS INDICATORS

When everything is working correctly:

### ESP32:
- ✅ WiFi connected (shows IP address)
- ✅ Sensors reading values
- ✅ HTTP 200/201 response every 5 seconds
- ✅ "Data sent successfully!" message

### Backend Terminal:
- ✅ "📥 [SENSOR DATA RECEIVED]" every 5 seconds
- ✅ "✅ [ESP32 DATA] Temp: X°C, Humidity: Y%, ..." logs
- ✅ "📡 Broadcasted with deviceId: ESP32_SENSOR_001"

### Frontend Dashboard:
- ✅ Green "ESP32 Connected" badge
- ✅ Sensor values updating live
- ✅ Toast notifications on updates
- ✅ Timestamp showing "few seconds ago"

### Crop Recommendation:
- ✅ Click "Predict Best Crop"
- ✅ Uses live sensor data
- ✅ Shows recommendation based on current conditions
- ✅ Can save crop plan and lock field

---

## 📊 WHAT HAPPENS WHEN ESP32 SENDS DATA

```
1. ESP32 reads sensors (Temperature, Humidity, Soil, pH, Rain)
   ↓
2. ESP32 creates JSON payload with "source": "krishi-sakha"
   ↓
3. ESP32 sends HTTP POST to http://YOUR_IP:5001/api/sensors/data
   ↓
4. Backend receives data
   ↓
5. Backend saves to MongoDB
   ↓
6. Backend broadcasts via WebSocket to ALL connected clients
   ↓
7. Dashboard receives WebSocket update
   ↓
8. Dashboard updates sensor cards (Temperature, Humidity, etc.)
   ↓
9. Dashboard shows green "ESP32 Connected" badge
   ↓
10. Toast notification appears with sensor values
   ↓
11. Crop Recommendation uses latest values for predictions
```

---

## 📝 FILES IN YOUR PROJECT

1. **`ESP32_Complete_Code.ino`** - Upload this to ESP32 (282 lines, production-ready)
2. **`ESP32_QUICK_TEST.md`** - Verification guide and troubleshooting
3. **`test_esp32_data.sh`** - Automated testing script (run: `bash test_esp32_data.sh`)
4. **`LIVE_SENSOR_DATA_FIXED.md`** - Complete technical documentation

---

## 🚨 IMPORTANT NOTES

1. **IP Address Changes**: If you restart WiFi or reconnect, your IP might change!
   - Always verify with `ipconfig getifaddr en0`
   - Update ESP32 code if changed
   - Re-upload to ESP32

2. **Both on Same Network**: ESP32 and computer MUST be on same WiFi
   - Check ESP32 shows WiFi connected
   - Check IP addresses are in same subnet (e.g., both 192.168.1.x)

3. **Backend Must Be Running**: ESP32 needs backend to accept data
   - Terminal 1: `cd backend && npm run dev`
   - Terminal 2: `cd frontend && npm run dev`

4. **Sensor Wiring**: Double-check all connections
   - Wrong wiring = no readings or damage
   - Use 3.3V (NOT 5V for ESP32!)
   - Common ground for all sensors

---

## ✅ FINAL VERIFICATION

Run this complete test:

```bash
# 1. Verify backend running
lsof -ti:5001

# 2. Check your IP
ipconfig getifaddr en0

# 3. Test backend endpoint
curl -X POST http://localhost:5001/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{"temperature":28.5,"humidity":72.3,"soilMoisture":65.8,"pH":6.5,"rainfall":12.0,"deviceId":"ESP32_SENSOR_001","source":"krishi-sakha"}'

# 4. Run automated test script
bash test_esp32_data.sh
```

**If all tests pass**, upload code to ESP32 and watch live data appear!

---

## 📞 NEED HELP?

Check logs in order:

1. **ESP32 Serial Monitor (115200 baud)**:
   - WiFi connection status
   - Sensor readings
   - HTTP response codes

2. **Backend Terminal**:
   - "📥 [SENSOR DATA RECEIVED]" messages
   - "✅ [ESP32 DATA]" logs
   - Any error messages

3. **Browser Console (F12)**:
   - WebSocket connection
   - "📡 Received sensor update" messages
   - Any JavaScript errors

4. **Dashboard**:
   - Green ESP32 badge
   - Sensor values updating
   - Toast notifications

---

**🎉 YOU'RE ALL SET! Your live sensor data system is ready to use!**

Upload the code to ESP32, open your dashboard, and watch the magic happen! 🚀
