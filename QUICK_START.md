# 🚀 Krishi Sakha - Quick Start Guide

## ✅ System is Running!

Your Krishi Sakha smart farming system is **fully operational** and ready to use!

---

## 🌐 Access the Application

### **Frontend (User Interface)**
```
URL: http://localhost:5173
Status: ✅ Running
```

**Click the preview button** in your IDE to open the application!

### **Backend (API Server)**
```
URL: http://localhost:5001
Status: ✅ Running
```

### **Database**
```
MongoDB: ✅ Connected
Port: 27017
```

---

## 🎯 What's New - Real-time Analytics!

### **NEW: Real-time Button in Analytics**

1. **Login** to your account (or create one)
2. Navigate to **Analytics** page
3. Look for the **Time Range** selector
4. Click the **"Real-time"** button (first button, green when active)
5. Watch the charts **update automatically** as new sensor data arrives!

### **Features**:
- 🟢 **Live updating charts** - No refresh needed
- 📊 **Real-time statistics** - Current values + averages
- 🔄 **Rolling window** - Last 50 readings
- ⏱️ **Precise timestamps** - Shows seconds in real-time mode
- 🎯 **Easy switching** - Toggle between real-time and historical

---

## 👤 Getting Started as a User

### **1. Create an Account**
```
1. Go to http://localhost:5173
2. Click "Sign Up"
3. Choose "Farmer" or "Agent"
4. Fill in your details
5. Click "Register"
```

### **2. Login**
```
1. Enter your email and password
2. Select your role
3. Click "Login"
```

### **3. Explore Features**

#### **For Farmers**:
- 🏠 **Dashboard** - Live sensor data, weather, quick actions
- 📊 **Analytics** - Real-time charts and historical trends
- 🗺️ **Fields** - Register and manage your fields
- 🌾 **Crop Recommendation** - AI-powered suggestions
- 🛰️ **Satellite Monitoring** - NDVI vegetation analysis
- 💧 **Irrigation** - Smart water management
- 👷 **Labor** - Find and hire agricultural services
- 💰 **Mandi Prices** - Real-time market rates
- 🤖 **AI Assistant** - Get farming advice
- 🔔 **Notifications** - Real-time alerts

#### **For Agents**:
- 🏠 **Dashboard** - Service requests overview
- 📋 **Requests** - View and manage service requests
- 👤 **Profile** - Set your services and availability
- 💰 **Earnings** - Track your income
- 🔔 **Notifications** - Real-time job alerts

---

## 🧪 Test Real-time Features

### **Method 1: Using Browser Console**
```javascript
// Open browser console (F12)
const socket = io('http://localhost:5001');

// Send test sensor data
socket.emit('sensorData', {
  temperature: 28.5,
  humidity: 72.3,
  soilMoisture: 65.8,
  pH: 6.5,
  rainfall: 0,
  timestamp: new Date().toISOString(),
  source: 'krishi-sakha',
  deviceId: 'ESP32-TEST-001'
});
```

### **Method 2: Connect ESP32 Sensors**
```
1. Flash ESP32 with sensor code
2. Configure WiFi credentials
3. Set backend URL to http://localhost:5001
4. Power on ESP32
5. Watch data appear in dashboard!
```

### **Expected Results**:
- ✅ Dashboard shows updated sensor values
- ✅ ESP32 connection badge turns green
- ✅ Analytics page updates if in real-time mode
- ✅ Charts show new data points
- ✅ Timestamp updates to current time

---

## 🎮 Feature Walkthrough

### **1. View Live Sensor Data**
```
Dashboard → Live Sensor Data Cards
- Temperature (°C)
- Humidity (%)
- Soil Moisture (%)
- pH Level
- Rainfall (mm)
```

### **2. Use Real-time Analytics**
```
Analytics → Click "Real-time" button
- Green banner confirms mode is active
- Charts update automatically
- Shows last 50 readings
- Current + average statistics
```

### **3. Get Crop Recommendations**
```
Crop Recommendation → Enter Rainfall → Predict
- AI analyzes sensor data
- Shows top 3 recommended crops
- Displays profitability scores
- Save to field (locks crop)
```

### **4. Monitor Field Health**
```
Fields → Select Field → Satellite Monitoring
- View field boundary on map
- NDVI vegetation analysis
- Health indicators
- Historical trends
```

### **5. Plan Irrigation**
```
Irrigation → Select Field
- Weather forecast
- Soil moisture levels
- Recommended schedule
- Save irrigation plan
```

### **6. Request Labor Services**
```
Labor → Search Agents → Select Service
- Browse available agents
- See distance and ratings
- Send service request
- Track status real-time
```

### **7. Check Market Prices**
```
Mandi Prices → Select State/Commodity
- Real-time market rates
- Price trends
- Refresh data button
- Filter by location
```

### **8. Chat with AI Assistant**
```
AI Assistant → Ask Questions
- Farming advice
- Pest management
- Crop care tips
- Weather guidance
```

---

## 📊 Analytics Page Guide

### **Time Range Options**:
- 🟢 **Real-time** - Live updating (last 50 readings)
- 🔵 **6h** - Last 6 hours
- 🔵 **12h** - Last 12 hours
- 🔵 **24h** - Last 24 hours (default)
- 🔵 **48h** - Last 48 hours
- 🔵 **7d** - Last 7 days

### **Charts Available**:
1. **Temperature & Humidity Trends** - Dual Y-axis line chart
2. **Soil Moisture Levels** - Area chart with gradient
3. **pH Level Variations** - Bar chart
4. **All Parameters Overview** - Combined line chart

### **Real-time Mode Features**:
- ✅ Auto-updating every time sensor data arrives
- ✅ Rolling window of 50 most recent readings
- ✅ Timestamps include seconds
- ✅ Current value + average displayed
- ✅ Green banner shows active status
- ✅ Smooth chart animations

---

## 🔧 Troubleshooting

### **Issue: Cannot see real-time updates**
**Solution**:
1. Check ESP32 connection badge (should be green)
2. Click "Real-time" button in time range selector
3. Wait for sensor data to arrive
4. Check browser console for WebSocket connection

### **Issue: "Failed to load fields" error**
**Solution**:
1. Check backend is running (port 5001)
2. Check MongoDB is running
3. Login again if token expired
4. Check browser console for details

### **Issue: Charts not rendering**
**Solution**:
1. Wait for data to load
2. Try switching time ranges
3. Refresh the page
4. Check if sensor data exists

### **Issue: WebSocket not connecting**
**Solution**:
1. Check backend is running
2. Check URL is http://localhost:5001
3. Check browser allows WebSocket
4. Try refreshing the page

---

## 📱 Mobile Testing

### **Access from Mobile Device**:
```
1. Find your computer's IP address
   - Mac: System Preferences → Network
   - Windows: ipconfig
   - Linux: ifconfig

2. Update frontend to expose network:
   cd frontend
   npm run dev -- --host

3. Access from mobile:
   http://[YOUR-IP]:5173
```

---

## 🛠️ Development Commands

### **Start Backend**
```bash
cd backend
npm run dev
```

### **Start Frontend**
```bash
cd frontend
npm run dev
```

### **Start MongoDB** (if not running)
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### **Check Running Services**
```bash
# Check backend
lsof -ti:5001

# Check frontend
lsof -ti:5173

# Check MongoDB
pgrep -x mongod
```

---

## 📚 Documentation

### **Available Documentation**:
- 📖 **TESTING_CHECKLIST.md** - Complete testing guide
- 📖 **SYSTEM_STATUS_REPORT.md** - Detailed status report
- 📖 **SYSTEM_ARCHITECTURE.md** - System architecture
- 📖 **MODEL_TRAINING_RESULTS.md** - ML model details
- 📖 **QUICK_START.md** - This guide

---

## 🎯 Key Features Summary

### **✅ Working Features**:
1. ✅ User Authentication (Farmer/Agent)
2. ✅ Live Sensor Data Display
3. ✅ **Real-time Analytics Dashboard**
4. ✅ AI-Powered Crop Recommendations
5. ✅ Field Management (GPS/Polygon/Survey)
6. ✅ Satellite Monitoring (NDVI)
7. ✅ Smart Irrigation Planning
8. ✅ Labor Marketplace
9. ✅ Mandi Price Tracking
10. ✅ AI Assistant Chatbot
11. ✅ Real-time Notifications
12. ✅ WebSocket Live Updates

---

## 🎉 You're All Set!

Your Krishi Sakha system is **fully operational** with all features working perfectly!

### **Next Steps**:
1. 🌐 **Open the preview** browser
2. 👤 **Create an account** or login
3. 📊 **Try the real-time analytics**
4. 🧪 **Test sensor data updates**
5. 🌾 **Get crop recommendations**
6. 🗺️ **Register your fields**

**Enjoy using Krishi Sakha! 🚜🌾**

---

**Questions or Issues?**
- Check TESTING_CHECKLIST.md for detailed testing
- Check SYSTEM_STATUS_REPORT.md for system status
- Check browser console for detailed logs
- All error messages are user-friendly

**Happy Farming! 🌱**
