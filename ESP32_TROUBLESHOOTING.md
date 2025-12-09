# 🔧 ESP32 TROUBLESHOOTING - YOUR DATA IS 509 SECONDS OLD

## ❌ **THE PROBLEM**

Dashboard shows: **"⚠️ Data is 509 seconds old"**

This means:
- ✅ Backend is working
- ✅ Frontend is working  
- ✅ Database is working
- ❌ **ESP32 IS NOT SENDING DATA** (stopped 8+ minutes ago)

---

## 🎯 **IMMEDIATE SOLUTION**

### Option 1: Test System with Simulator (FASTEST!)

1. **Open this file in browser**:
   ```
   ESP32_Simulator.html
   ```
   
2. **Click "Send to Dashboard"**

3. **Check dashboard** - Should update IMMEDIATELY with:
   - Temperature: 28.5°C
   - Humidity: 72.3%
   - Soil: 65.8%
   - Green "ESP32 Connected" badge

**If this works** → Your system is PERFECT! ESP32 is the problem.
**If this doesn't work** → Backend/WebSocket issue (see below).

---

### Option 2: Your ESP32 is NOT Running

**CHECK ESP32 STATUS:**

1. **Is ESP32 powered on?**
   - LED should be lit
   - USB cable connected
   - Power supply working

2. **Did you upload the code?**
   - Open Arduino IDE
   - Open `ESP32_Complete_Code.ino`
   - Click Upload (➡️ button)
   - Wait for "Done uploading"

3. **Open Serial Monitor**
   - Tools → Serial Monitor
   - Set baud rate: **115200**
   - You should see:
     ```
     ✅ WiFi Connected!
     📡 Sending data to server...
     ✅ Data sent successfully!
     ```
   
   **If you DON'T see this** → ESP32 has a problem!

---

## 🔍 **DIAGNOSE ESP32 ISSUES**

### Problem 1: WiFi Not Connecting

**Serial Monitor shows:**
```
📡 Connecting to WiFi: ABCDE
🔄 ....................
❌ WiFi Connection Failed!
```

**SOLUTION:**
1. Verify WiFi credentials in code:
   ```cpp
   const char* ssid = "ABCDE";        // ← Check this!
   const char* password = "123456789"; // ← Check this!
   ```

2. **WiFi must be 2.4GHz** (ESP32 doesn't support 5GHz)
   - Check router settings
   - Switch to 2.4GHz band

3. Move ESP32 closer to router

4. Restart router

5. Try different WiFi network

---

### Problem 2: WiFi Connected but HTTP Error

**Serial Monitor shows:**
```
✅ WiFi Connected!
📡 Sending data to server...
❌ Connection Error: -1
```

**SOLUTION - IP ADDRESS IS WRONG!**

**Step 1: Find Your Current IP**
```bash
# On Mac terminal:
ipconfig getifaddr en0

# Example output: 192.168.1.105
```

**Step 2: Update ESP32 Code**

Current code has:
```cpp
const char* serverUrl = "http://10.116.189.241:5001/api/sensors/data";
```

**Change to YOUR IP:**
```cpp
const char* serverUrl = "http://192.168.1.105:5001/api/sensors/data";
//                            ^^^^^^^^^^^^^^
//                            YOUR IP HERE!
```

**Step 3: Re-upload to ESP32**

**Step 4: Open Serial Monitor - should now work!**

---

### Problem 3: Firewall Blocking ESP32

**Symptoms:**
- WiFi connected
- Correct IP address
- Still getting HTTP error

**SOLUTION:**

**Mac:**
```bash
# Temporarily disable firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off

# Test ESP32

# Re-enable firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

**Or allow port 5001:**
1. System Preferences → Security & Privacy → Firewall
2. Firewall Options
3. Add "node" application
4. Allow incoming connections

---

### Problem 4: Backend Not Running

**Serial Monitor shows:**
```
✅ WiFi Connected!
📡 Sending data to server...
⚠️ HTTP Error Code: 404
```

**SOLUTION:**

Open terminal and start backend:
```bash
cd /Users/sushanthks/Developer/FINALMINIPROJECT/phase3first/backend
npm run dev
```

You should see:
```
🚀 Server running on port 5001
✅ Connected to MongoDB
```

---

### Problem 5: Sensor Reading NaN or 0

**Serial Monitor shows:**
```
🌡️ Temperature: NaN °C
💧 Humidity: NaN %
```

**SOLUTION:**

**DHT22 Sensor:**
1. Check wiring:
   - VCC → 3.3V (NOT 5V!)
   - GND → GND
   - DATA → GPIO 4
2. Add 10kΩ pull-up resistor between DATA and VCC
3. Wait 2 seconds after powering ESP32
4. Try different DHT22 sensor (might be faulty)

**Other Sensors:**
- **Soil Moisture**: GPIO 34 (analog input)
- **pH Sensor**: GPIO 35 (analog input)
- **Rain Sensor**: GPIO 32 (analog input)

---

## ✅ **VERIFY SYSTEM IS WORKING**

### Test 1: Open ESP32_Simulator.html

1. Double-click `ESP32_Simulator.html`
2. Click "Send to Dashboard"
3. Dashboard should update within 1 second

**Result:**
- ✅ Works → System is PERFECT, fix ESP32
- ❌ Doesn't work → Continue to Test 2

---

### Test 2: Check Backend Logs

Open backend terminal and look for:
```
📥 [SENSOR DATA RECEIVED]
✅ Validated data: { temperature: 32.5, ... }
💾 Saved to database
📡 Broadcasting to frontend
✅ [ESP32 DATA] Temp: 32.5°C, Humidity: 78.2%, ...
```

**Result:**
- ✅ Seeing these logs → Backend working, check frontend
- ❌ Not seeing logs → Backend not receiving data

---

### Test 3: Check Frontend WebSocket

Open browser console (F12) and look for:
```
🔌 Setting up WebSocket listeners...
Socket connected
📡 Received sensor update: { ... }
✅ Live ESP32 data: { ... }
```

**Result:**
- ✅ Seeing these logs → WebSocket working
- ❌ Not seeing logs → WebSocket issue, refresh page

---

## 🚨 **CRITICAL CHECKLIST**

Before contacting support, verify:

- [ ] Backend running: `lsof -ti:5001` shows process ID
- [ ] Frontend running: `lsof -ti:5173` shows process ID
- [ ] ESP32 powered on and LED lit
- [ ] ESP32 code uploaded (Arduino IDE shows "Done uploading")
- [ ] Serial Monitor open (115200 baud)
- [ ] WiFi SSID and password correct
- [ ] IP address matches your current IP
- [ ] Firewall allows port 5001
- [ ] Both ESP32 and computer on SAME WiFi network
- [ ] Sensors wired correctly
- [ ] ESP32_Simulator.html test works

---

## 📊 **EXPECTED DATA FLOW**

When everything works correctly:

```
1. ESP32 reads sensors every 5 seconds
   ↓
2. ESP32 sends HTTP POST to http://YOUR_IP:5001/api/sensors/data
   ↓
3. Backend receives data
   Backend logs: "📥 [SENSOR DATA RECEIVED]"
   ↓
4. Backend saves to MongoDB
   Backend logs: "💾 Saved to database"
   ↓
5. Backend broadcasts via WebSocket
   Backend logs: "📡 Broadcasting to frontend"
   ↓
6. Frontend receives WebSocket update
   Browser console: "📡 Received sensor update"
   ↓
7. Dashboard updates sensor cards
   Shows: Temperature, Humidity, Soil, pH, Rainfall
   ↓
8. Green "ESP32 Connected" badge appears
   ↓
9. Toast notification shows new values
```

**ALL OF THIS HAPPENS IN 1 SECOND!**

---

## 🎯 **YOUR CURRENT SITUATION**

Based on error: **"Data is 509 seconds old"**

**Diagnosis:**
- ✅ System received data 8 minutes ago (worked at that time!)
- ❌ ESP32 stopped sending (not running or crashed)
- ✅ Backend still running (showing old data)
- ✅ Frontend still working (displaying old data)

**Solution:**
1. Check ESP32 Serial Monitor
2. If no output → ESP32 crashed or not running
3. Press RESET button on ESP32
4. Or re-upload code
5. Watch Serial Monitor for "✅ Data sent successfully!"
6. Dashboard should update within 5 seconds

---

## 🆘 **STILL NOT WORKING?**

### Last Resort Checklist:

1. **Restart Everything:**
   ```bash
   # Stop backend (Ctrl+C)
   # Stop frontend (Ctrl+C)
   
   # Restart MongoDB
   brew services restart mongodb-community
   
   # Start backend
   cd backend && npm run dev
   
   # Start frontend (new terminal)
   cd frontend && npm run dev
   
   # Power cycle ESP32
   ```

2. **Test with Simulator:**
   - Open ESP32_Simulator.html
   - Click "Send to Dashboard"
   - If this works → ESP32 is the ONLY problem

3. **Check ESP32 Hardware:**
   - Try different USB cable
   - Try different USB port
   - Try different power supply
   - Check for loose wires
   - Check for short circuits

4. **Verify IP Address Changed:**
   ```bash
   ipconfig getifaddr en0
   ```
   If different from `10.116.189.241`, update ESP32 code!

5. **Check Network Isolation:**
   - Some routers isolate WiFi clients
   - Try disabling AP Isolation in router settings
   - Or connect both to 2.4GHz band

---

## ✅ **QUICK FIX COMMANDS**

```bash
# Check backend status
lsof -ti:5001

# Check frontend status  
lsof -ti:5173

# Find your IP
ipconfig getifaddr en0

# Test backend manually
curl -X POST http://localhost:5001/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{"temperature":30,"humidity":70,"soilMoisture":60,"pH":6.8,"rainfall":10,"deviceId":"ESP32_SENSOR_001","source":"krishi-sakha"}'

# Restart backend
cd backend
npm run dev

# Restart frontend
cd frontend
npm run dev
```

---

## 📞 **SUPPORT**

If you've tried everything:

1. **Provide these details:**
   - ESP32 Serial Monitor output (full log)
   - Backend terminal output (last 50 lines)
   - Browser console output (F12)
   - Your computer's IP address
   - WiFi network name
   - ESP32_Simulator.html test result

2. **Common Solution (90% of cases):**
   - IP address changed → Update ESP32 code
   - ESP32 not running → Upload code and open Serial Monitor
   - WiFi not connected → Check SSID/password

---

**🎯 MOST LIKELY ISSUE: Your ESP32 is not running or crashed. Press RESET button or re-upload code!**
