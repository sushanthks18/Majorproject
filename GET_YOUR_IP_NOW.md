# 🌐 GET YOUR IP ADDRESS - DO THIS FIRST!

## ⚡ QUICK METHOD (30 seconds)

### **Step 1: Open Terminal**
Press `Cmd + Space`, type `Terminal`, press Enter

### **Step 2: Run This Command**
```bash
ipconfig getifaddr en0
```

### **Step 3: You'll See Your IP**
Example output:
```
192.168.1.105
```

**✅ THIS IS YOUR IP ADDRESS!**

---

## 🔧 UPDATE ESP32 CODE

### **Step 1: Open File**
Open `ESP32_FINAL_CODE.ino` in Arduino IDE

### **Step 2: Find Line 25**
Look for this line:
```cpp
const char* serverUrl = "http://10.116.189.241:5001/api/sensors/data";
```

### **Step 3: Replace IP**
Change `10.116.189.241` to YOUR IP:
```cpp
const char* serverUrl = "http://192.168.1.105:5001/api/sensors/data";
//                            ^^^^^^^^^^^^^^
//                            YOUR IP HERE!
```

### **Step 4: Save & Upload**
1. Click **File** → **Save**
2. Click **Upload** button (→)
3. Wait for "Done uploading"

### **Step 5: Open Serial Monitor**
1. Click **Tools** → **Serial Monitor**
2. Set to **115200 baud**
3. Watch for: `✅ Data sent successfully!`

---

## ✅ VERIFICATION

When working correctly, Serial Monitor shows:
```
🌾 Krishi Sakha IoT Sensor Client
========================================
🔌 Connecting to WiFi: ABCDE
✅ WiFi Connected!
   IP Address: 192.168.x.x
   Signal Strength: -45 dBm

📡 Configuration:
   Server: http://192.168.1.105:5001/api/sensors/data
   Device ID: ESP32_SENSOR_001
   Update Interval: 5 seconds
========================================

📤 Sending data to backend...
   Count: #1
   Temperature: 28.5°C
   Humidity: 72.3%
   Soil Moisture: 65.8%
   pH: 6.5
   Rainfall: 12.0%
✅ Data sent successfully!
========================================
```

---

## 📊 CHECK DASHBOARD

After ESP32 sends data:
1. Open: http://localhost:5173
2. Login as farmer
3. **Within 5 seconds** you should see:
   - 🟢 Green "ESP32 Connected" badge
   - Live sensor values updating
   - Toast notification with values
   - Timestamp showing "few seconds ago"

---

## ❌ TROUBLESHOOTING

### Problem: Can't Find IP
**Try alternative command:**
```bash
# Show all network IPs
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Problem: WiFi Not Connecting
**Check:**
- SSID is `"ABCDE"` (correct spelling)
- Password is `"123456789"` (correct)
- WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- ESP32 is close to router

### Problem: HTTP Connection Error
**Most Common Cause:** Wrong IP address!
1. Re-check IP: `ipconfig getifaddr en0`
2. Update ESP32 code
3. Re-upload

### Problem: Backend Not Running
**Solution:**
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

## 🎯 COMPLETE CHECKLIST

- [ ] Found IP address using `ipconfig getifaddr en0`
- [ ] Updated `serverUrl` in ESP32_FINAL_CODE.ino
- [ ] WiFi SSID is "ABCDE"
- [ ] WiFi password is "123456789"
- [ ] Backend running on port 5001
- [ ] Frontend running on port 5173
- [ ] Uploaded code to ESP32
- [ ] Serial Monitor open (115200 baud)
- [ ] Seeing "✅ Data sent successfully!"
- [ ] Dashboard showing live data

---

## 📞 STILL HAVING ISSUES?

### Test System First:
Open `ESP32_Simulator.html` in browser → Click "Send to Dashboard"

**If this works:** Your system is fine, ESP32 is the problem
**If this doesn't work:** Backend/WebSocket issue

---

**🎯 MOST IMPORTANT: GET YOUR IP ADDRESS AND UPDATE ESP32 CODE BEFORE UPLOADING!**

Run this NOW:
```bash
ipconfig getifaddr en0
```

Then update line 25 in `ESP32_FINAL_CODE.ino` with YOUR IP!
