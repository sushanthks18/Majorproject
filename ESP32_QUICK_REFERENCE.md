# 🚀 ESP32 Quick Reference Card

## ⚡ Quick Start (5 Steps)

### **1. Configure WiFi & Server**
```cpp
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* serverUrl = "http://YOUR_IP:5001/api/sensors/data";
```

### **2. Upload to ESP32**
- Connect ESP32 via USB
- Select **ESP32 Dev Module** in Tools → Board
- Click **Upload** (→)

### **3. Start Backend**
```bash
cd backend
npm run dev
```

### **4. Open Serial Monitor**
- Tools → Serial Monitor
- Baud: 115200
- Check for "WiFi Connected!" and "Data sent successfully!"

### **5. View on Dashboard**
- Open http://localhost:5173
- Login as farmer
- See live data updating!

---

## 📌 Pin Connections Summary

```
DHT22:    GPIO 4   (Temperature & Humidity)
Soil:     GPIO 34  (Soil Moisture)
pH:       GPIO 35  (pH Level)
Rain:     GPIO 32  (Rain Sensor)
LCD SDA:  GPIO 21  (I2C Data)
LCD SCL:  GPIO 22  (I2C Clock)
```

---

## 🔍 Finding Your IP Address

**Windows**: `ipconfig` → Look for IPv4 Address  
**Mac**: `ifconfig en0` → Look for inet  
**Linux**: `ip addr` → Look for inet  

Example: `192.168.1.105`

---

## ⚙️ Common Calibration Values

### Soil Moisture:
```cpp
SOIL_DRY_VALUE = 4095;   // In air
SOIL_WET_VALUE = 1200;   // In water
```

### pH Sensor:
```cpp
PH_NEUTRAL_VOLTAGE = 1.5;  // pH 7.0
PH_STEP = 0.18;            // Per pH unit
```

### Rain Sensor:
```cpp
RAIN_DRY_VALUE = 4095;   // Dry
RAIN_WET_VALUE = 1000;   // Wet
```

---

## 🐛 Quick Troubleshooting

| Issue | Fix |
|-------|-----|
| WiFi won't connect | Check SSID/password, use 2.4GHz |
| HTTP Error -1 | Backend not running, check IP |
| NaN readings | Check DHT22 wiring, add delay |
| LCD blank | Check I2C address (0x27 or 0x3F) |
| Data not showing | Check "source: krishi-sakha" in code |

---

## 📊 Serial Monitor Keywords

✅ = Success  
❌ = Error  
⚠️ = Warning  
📤 = Sending  
📥 = Received  

---

## 🔄 Update Frequency

- **Send to backend**: Every 5 seconds
- **LCD update**: Every 3 seconds
- **WiFi check**: Every loop

---

## 🛠️ Required Libraries

1. ArduinoJson
2. DHT sensor library
3. Adafruit Unified Sensor
4. LiquidCrystal I2C

Install via: **Sketch → Include Library → Manage Libraries**

---

## 🌐 Key URLs

- Backend: `http://YOUR_IP:5001`
- Frontend: `http://localhost:5173`
- Sensor API: `http://YOUR_IP:5001/api/sensors/data`

---

## 📱 Expected Behavior

1. **Power On** → LCD shows "Krishi Sakha"
2. **Connecting** → LCD shows WiFi name
3. **Connected** → LCD shows IP address
4. **Running** → LCD cycles through sensor readings
5. **Sending** → Serial shows "Data sent successfully!"

---

**✨ Ready to Farm Smart! ✨**
