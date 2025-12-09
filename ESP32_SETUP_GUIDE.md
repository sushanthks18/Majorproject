# 🌾 ESP32 IoT Sensor Setup Guide - Krishi Sakha

## 📋 Complete Hardware & Software Setup Instructions

---

## 🔧 Hardware Requirements

### **Main Components**:
1. **ESP32 Development Board** (NodeMCU-32S or similar)
2. **DHT22** - Temperature & Humidity Sensor
3. **Capacitive Soil Moisture Sensor**
4. **pH Sensor Module** (Analog output)
5. **Rain Sensor Module** (Analog output)
6. **LCD 16x2 I2C Display** (Optional but recommended)
7. **Breadboard** and **Jumper Wires**
8. **USB Cable** (for programming ESP32)
9. **5V Power Supply** (optional, for standalone operation)

---

## 🔌 Wiring Diagram

### **ESP32 Pin Connections**:

```
┌─────────────────────────────────────────────────────────────┐
│                      ESP32 PINOUT                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DHT22 Sensor:                                             │
│    VCC  → 3.3V                                             │
│    GND  → GND                                              │
│    DATA → GPIO 4                                           │
│                                                             │
│  Soil Moisture Sensor (Capacitive):                        │
│    VCC  → 3.3V                                             │
│    GND  → GND                                              │
│    AOUT → GPIO 34 (ADC1_CH6)                               │
│                                                             │
│  pH Sensor Module:                                         │
│    VCC  → 5V (or 3.3V if compatible)                       │
│    GND  → GND                                              │
│    AOUT → GPIO 35 (ADC1_CH7)                               │
│                                                             │
│  Rain Sensor:                                              │
│    VCC  → 3.3V                                             │
│    GND  → GND                                              │
│    AOUT → GPIO 32 (ADC1_CH4)                               │
│                                                             │
│  LCD 16x2 I2C Display:                                     │
│    VCC  → 5V                                               │
│    GND  → GND                                              │
│    SDA  → GPIO 21                                          │
│    SCL  → GPIO 22                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Important Notes**:
- ⚠️ Use **3.3V** for DHT22 and soil moisture sensor
- ⚠️ pH sensor may need **5V** (check your module specs)
- ⚠️ Use only **ADC1** pins (GPIO 32-39) for analog sensors
- ⚠️ **DO NOT** use ADC2 pins (conflicts with WiFi)

---

## 💻 Software Setup

### **Step 1: Install Arduino IDE**
1. Download from: https://www.arduino.cc/en/software
2. Install for your operating system
3. Open Arduino IDE

### **Step 2: Install ESP32 Board Support**
1. Open **File → Preferences**
2. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Click **OK**
4. Go to **Tools → Board → Boards Manager**
5. Search for **"ESP32"**
6. Install **"esp32 by Espressif Systems"** (version 2.0.0 or later)

### **Step 3: Install Required Libraries**
Go to **Sketch → Include Library → Manage Libraries**, search and install:

1. **ArduinoJson** (by Benoit Blanchon) - Latest version
2. **DHT sensor library** (by Adafruit) - Latest version
3. **Adafruit Unified Sensor** (dependency for DHT) - Latest version
4. **LiquidCrystal I2C** (by Frank de Brabander) - Latest version

---

## ⚙️ Configuration Steps

### **Step 1: Find Your Computer's IP Address**

#### **Windows**:
```
1. Open Command Prompt (CMD)
2. Type: ipconfig
3. Look for "IPv4 Address" under your active network adapter
4. Example: 192.168.1.105
```

#### **Mac/Linux**:
```
1. Open Terminal
2. Type: ifconfig (Mac) or ip addr (Linux)
3. Look for "inet" under your active network (en0 or wlan0)
4. Example: 192.168.1.105
```

### **Step 2: Update ESP32 Code**

Open `ESP32_Sensor_Client.ino` and update these lines:

```cpp
// Line 27-28: WiFi Credentials
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// Line 36: Server URL (use YOUR computer's IP)
const char* serverUrl = "http://192.168.1.105:5001/api/sensors/data";
//                              ^^^^^^^^^^^^^^^^
//                              Replace with your IP from Step 1
```

### **Step 3: Upload Code to ESP32**

1. Connect ESP32 to your computer via USB
2. In Arduino IDE:
   - **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
   - **Tools → Port → Select your COM port** (e.g., COM3 on Windows)
   - **Tools → Upload Speed → 115200**
3. Click **Upload** button (→)
4. Wait for compilation and upload to complete

---

## 🧪 Sensor Calibration

### **Soil Moisture Sensor Calibration**:

```cpp
// In air (completely dry):
// 1. Upload code and open Serial Monitor
// 2. Uncomment "Serial.print("Soil Raw: ");" in readSensors()
// 3. Note the value (e.g., 4095)
// 4. Update: const int SOIL_DRY_VALUE = 4095;

// In water (fully saturated):
// 1. Place sensor in glass of water
// 2. Note the value (e.g., 1200)
// 3. Update: const int SOIL_WET_VALUE = 1200;
```

### **pH Sensor Calibration**:

```cpp
// Using pH 7.0 buffer solution:
// 1. Place pH sensor in pH 7.0 solution
// 2. Uncomment pH debug lines in readSensors()
// 3. Note the voltage reading
// 4. Update: const float PH_NEUTRAL_VOLTAGE = 1.5;  // Your value

// Using pH 4.0 buffer solution:
// 1. Place pH sensor in pH 4.0 solution
// 2. Note the voltage reading
// 3. Calculate: PH_STEP = (pH4_voltage - pH7_voltage) / 3
// 4. Update: const float PH_STEP = 0.18;  // Your calculated value
```

### **Rain Sensor Calibration**:

```cpp
// Dry condition:
// 1. Keep sensor dry
// 2. Note raw value from Serial Monitor
// 3. Update: const int RAIN_DRY_VALUE = 4095;

// Wet condition:
// 1. Pour water on sensor
// 2. Note raw value
// 3. Update: const int RAIN_WET_VALUE = 1000;
```

---

## 🚀 Testing & Verification

### **Step 1: Check Serial Monitor**
1. Open **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. You should see:
   ```
   ========================================
   🌾 Krishi Sakha IoT Sensor Client
   ========================================
   🔌 Connecting to WiFi: YOUR_SSID
   ✅ WiFi Connected!
      IP Address: 192.168.1.XXX
   📤 Sending data to backend...
   ```

### **Step 2: Verify Backend Receives Data**
1. Make sure backend is running: `cd backend && npm run dev`
2. Check terminal for:
   ```
   📊 Sensor data broadcasted:
     temp: 28.5
     humidity: 72.3
     soilMoisture: 65.8
     pH: 6.5
   ```

### **Step 3: Check Frontend Dashboard**
1. Open http://localhost:5173
2. Login as farmer
3. Check dashboard for:
   - ✅ Live sensor values updating
   - ✅ "ESP32 Connected" green badge
   - ✅ Real-time updates every 5 seconds

---

## 🐛 Troubleshooting

### **WiFi Connection Issues**:

| Problem | Solution |
|---------|----------|
| WiFi won't connect | - Check SSID and password are correct<br>- Ensure router is 2.4GHz (ESP32 doesn't support 5GHz)<br>- Move ESP32 closer to router |
| Connects then disconnects | - Check router signal strength<br>- Try different WiFi channel<br>- Update router firmware |

### **Backend Connection Issues**:

| Problem | Solution |
|---------|----------|
| HTTP Error -1 | - Backend not running on port 5001<br>- Wrong IP address in serverUrl<br>- Firewall blocking connection |
| Response Code 404 | - Check URL path is correct<br>- Verify backend routes are registered |
| Response Code 500 | - Backend server error<br>- Check MongoDB is running<br>- Check backend logs |

### **Sensor Reading Issues**:

| Sensor | Problem | Solution |
|--------|---------|----------|
| DHT22 | NaN readings | - Check wiring (VCC, GND, DATA)<br>- Add pull-up resistor (4.7kΩ) to DATA pin<br>- Wait 2 seconds after power-on |
| Soil Moisture | Always 0% or 100% | - Calibrate sensor (see calibration section)<br>- Check analog pin connection<br>- Test with multimeter |
| pH Sensor | Unstable readings | - Calibrate with buffer solutions<br>- Keep probe wet in storage solution<br>- Clean probe with distilled water |
| Rain Sensor | Not responsive | - Check if sensor has power LED<br>- Clean sensor surface<br>- Adjust sensitivity potentiometer |

### **LCD Display Issues**:

| Problem | Solution |
|---------|----------|
| LCD blank/no backlight | - Check I2C address (try 0x27 or 0x3F)<br>- Verify SDA/SCL connections<br>- Run I2C scanner sketch |
| Garbled text | - Adjust contrast potentiometer<br>- Check I2C pull-up resistors<br>- Reduce I2C clock speed |

---

## 📊 Expected Output

### **Serial Monitor Output**:
```
========================================
🌾 Krishi Sakha IoT Sensor Client
========================================
🔌 Connecting to WiFi: YourWiFi
✅ WiFi Connected!
   IP Address: 192.168.1.100
   Signal Strength: -45 dBm

📡 Configuration:
   Server: http://192.168.1.105:5001/api/sensors/data
   Device ID: ESP32_SENSOR_001
   Update Interval: 5 seconds
========================================

🌧️  Rain Raw: 3850 → 6%

📤 Sending data to backend...
   Count: #1
   🌡️  Temperature: 28.5°C
   💧 Humidity: 72.3%
   🌱 Soil Moisture: 65.8%
   ⚗️  pH: 6.52
   🌧️  Rain Level: 6.0%
   ✅ Server Response Code: 200
   📥 Response: {"message":"Sensor data received"}
   ✅ Data sent successfully!
========================================
```

### **LCD Display** (cycles every 3 seconds):
```
Screen 1:              Screen 2:              Screen 3:
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│Temp: 28.5°C    │    │Soil: 65.8%     │    │Rain: 6.0%      │
│Hum:  72.3%     │    │pH:   6.52      │    │WiFi: OK    #15 │
└────────────────┘    └────────────────┘    └────────────────┘
```

---

## 🔐 Security Notes

1. **WiFi Credentials**: Stored in code (consider using EEPROM for production)
2. **API Key**: Simple authentication (enhance for production)
3. **HTTPS**: Not implemented (use for production with SSL certificates)
4. **Network**: Ensure backend is on trusted network

---

## 🎯 Next Steps

1. ✅ Verify all sensors are working
2. ✅ Calibrate sensors for accurate readings
3. ✅ Test real-time updates on dashboard
4. ✅ Monitor for 24 hours for stability
5. 📋 Consider adding battery backup for power outages
6. 📋 Implement OTA (Over-The-Air) updates
7. 📋 Add watchdog timer for auto-recovery
8. 📋 Store data locally if WiFi fails

---

## 📞 Support

**Issues with ESP32**:
- Check Serial Monitor for debug messages
- Verify wiring with multimeter
- Test each sensor individually

**Issues with Backend**:
- Check backend logs: `cd backend && npm run dev`
- Verify MongoDB is running
- Test API endpoint with Postman

**Issues with Frontend**:
- Check browser console (F12)
- Verify WebSocket connection
- Clear cache and reload

---

**✨ Your ESP32 is now ready to send live sensor data to Krishi Sakha! ✨**
