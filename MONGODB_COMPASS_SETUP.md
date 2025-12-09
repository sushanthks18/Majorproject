# 🗄️ MONGODB COMPASS - CONNECT & VIEW SENSOR DATA

## ✅ YOUR CURRENT SETUP

**Database Name:** `smart-agriculture`  
**Connection String:** `mongodb://localhost:27017/smart-agriculture`  
**Collections:**
- `sensordatas` - ALL your ESP32 sensor readings (stored automatically)
- `users` - Farmer and agent accounts
- `fields` - Farm field information
- Other collections for requests, notifications, etc.

---

## 🔌 CONNECT MONGODB COMPASS

### **Step 1: Open MongoDB Compass**

Launch MongoDB Compass application on your Mac.

### **Step 2: Create New Connection**

1. Click **"New Connection"** (green button)
2. In the connection string box, paste:
   ```
   mongodb://localhost:27017/smart-agriculture
   ```
3. Click **"Connect"**

### **Step 3: View Your Data**

After connecting, you'll see:
```
📁 smart-agriculture (database)
  └── 📊 sensordatas (your ESP32 data!)
  └── 👥 users
  └── 🌾 fields
  └── 📝 requests
  └── 🔔 notifications
  └── ... (other collections)
```

### **Step 4: View Sensor Data**

1. Click on **`sensordatas`** collection
2. You'll see all sensor readings with:
   - `temperature`
   - `humidity`
   - `soilMoisture`
   - `pH`
   - `rainfall`
   - `timestamp`
   - `farmerId`

---

## 📊 VERIFY DATA IS BEING STORED

### **Test 1: Send Test Data**

1. Open **`test_live_data.html`** in browser
2. Click **"Send Test Data NOW"**
3. Go to MongoDB Compass
4. Click **Refresh** button (🔄) in Compass
5. You should see NEW document with current timestamp!

### **Test 2: Check Latest Entry**

In MongoDB Compass:
1. Click **`sensordatas`** collection
2. Click **"Options"** → **"Sort"**
3. Add sort: `{ "timestamp": -1 }`
4. Click **"Apply"**
5. Latest readings appear at top!

### **Example Data in Compass:**

```json
{
  "_id": "6935c4ff2984d4653e08fda2",
  "temperature": 28.5,
  "humidity": 72.3,
  "soilMoisture": 65.8,
  "pH": 6.5,
  "rainfall": 12,
  "farmerId": null,
  "timestamp": "2025-12-07T18:18:39.341Z",
  "__v": 0
}
```

---

## 🔍 QUERY YOUR DATA IN COMPASS

### **Filter by Date Range** (Last 24 hours)

Click **Filter** button and paste:
```json
{
  "timestamp": {
    "$gte": { "$date": "2025-12-07T00:00:00.000Z" }
  }
}
```

### **Filter by Temperature Range** (Above 30°C)

```json
{
  "temperature": { "$gte": 30 }
}
```

### **Filter by Humidity** (High humidity > 80%)

```json
{
  "humidity": { "$gte": 80 }
}
```

### **Count Total Readings**

Click **"Aggregations"** tab and add:
```json
[
  {
    "$count": "total"
  }
]
```

### **Get Average Temperature**

```json
[
  {
    "$group": {
      "_id": null,
      "avgTemp": { "$avg": "$temperature" },
      "avgHumidity": { "$avg": "$humidity" },
      "avgSoil": { "$avg": "$soilMoisture" }
    }
  }
]
```

---

## 📈 DATA IS ALREADY STORED AUTOMATICALLY

**Your system is ALREADY storing all sensor data!**

Every time ESP32 (or test tool) sends data:
1. ✅ Backend receives it (`POST /api/sensors/data`)
2. ✅ Saves to MongoDB `sensordatas` collection
3. ✅ Broadcasts via WebSocket to dashboard
4. ✅ Dashboard displays it in real-time

**No additional configuration needed!**

---

## 🔄 DASHBOARD AUTO-REFRESH

Your dashboard already auto-refreshes! Here's how it works:

### **Current Behavior:**

1. **On Page Load:** Fetches latest sensor data
2. **WebSocket Updates:** Receives real-time updates when new data arrives
3. **No Manual Refresh Needed:** Updates automatically!

### **Time Range Filters:**

Dashboard supports multiple time ranges:
- Last 1 hour
- Last 6 hours
- Last 24 hours
- Last 7 days
- Real-time mode (last 50 readings)

---

## 📊 VIEW DATA IN COMPASS

### **See Last 24 Hours of Data:**

1. Open MongoDB Compass
2. Go to `sensordatas` collection
3. Click **Filter**
4. Paste this query:

```json
{
  "timestamp": {
    "$gte": {
      "$date": {
        "$subtract": [
          "$$NOW",
          86400000
        ]
      }
    }
  }
}
```

5. Click **Find**
6. All readings from last 24 hours appear!

---

## 🎯 EXPORT DATA FROM COMPASS

### **Export to JSON:**

1. Click **`sensordatas`** collection
2. Click **"Export Data"** button
3. Select format: **JSON**
4. Choose location to save
5. Click **Export**

### **Export to CSV:**

1. Same steps as above
2. Select format: **CSV**
3. Choose which fields to export
4. Click **Export**

---

## 🔧 TROUBLESHOOTING

### **Problem: Compass Can't Connect**

**Cause:** MongoDB not running

**Solution:**
```bash
# Check if MongoDB is running
brew services list | grep mongodb

# If not running, start it:
brew services start mongodb-community

# Or manually start:
mongod --config /usr/local/etc/mongod.conf
```

### **Problem: No Data in Collection**

**Cause:** ESP32 not sending data OR backend not running

**Solution:**
1. Check backend is running: `cd backend && npm run dev`
2. Send test data: Open `test_live_data.html` → Click "Send Test Data NOW"
3. Refresh Compass (🔄 button)
4. Data should appear!

### **Problem: Old Data Only**

**Cause:** ESP32 stopped sending

**Solution:**
1. Upload ESP32 code
2. Open Serial Monitor
3. Watch for "✅ Data sent successfully!"
4. Check Compass - new data should appear every 5 seconds

---

## 📋 MONGODB COMPASS QUICK REFERENCE

### **Useful Buttons:**

| Button | Purpose |
|--------|---------|
| 🔄 Refresh | Reload data from database |
| 🔍 Filter | Query/search data |
| 📊 Aggregations | Run complex queries |
| 📥 Export Data | Save to JSON/CSV |
| ➕ Insert Document | Add data manually |
| 🗑️ Delete | Remove documents |

### **Connection String:**
```
mongodb://localhost:27017/smart-agriculture
```

### **Database Name:**
```
smart-agriculture
```

### **Main Collection:**
```
sensordatas
```

---

## ✅ VERIFY EVERYTHING IS WORKING

### **Checklist:**

- [ ] MongoDB running: `brew services list | grep mongodb`
- [ ] Backend running: Terminal shows "✅ Connected to MongoDB"
- [ ] Compass connected to `mongodb://localhost:27017/smart-agriculture`
- [ ] Can see `sensordatas` collection in Compass
- [ ] Send test data from `test_live_data.html`
- [ ] Refresh Compass - new data appears
- [ ] Dashboard shows same data
- [ ] Data has recent timestamp (within last few minutes)

---

## 🎉 SUCCESS INDICATORS

**When everything is working:**

1. **MongoDB Compass:** Shows increasing number of documents in `sensordatas`
2. **Backend Terminal:** Shows "📥 [SENSOR DATA RECEIVED]" logs
3. **Dashboard:** Updates automatically with new values
4. **Timestamps:** Recent (within seconds/minutes, not hours old)

---

## 📊 SAMPLE QUERIES FOR ANALYSIS

### **Get Temperature Trends (Last 6 Hours)**

In Compass Aggregations:
```json
[
  {
    "$match": {
      "timestamp": {
        "$gte": {
          "$date": {
            "$subtract": ["$$NOW", 21600000]
          }
        }
      }
    }
  },
  {
    "$project": {
      "temperature": 1,
      "humidity": 1,
      "timestamp": 1
    }
  },
  {
    "$sort": {
      "timestamp": 1
    }
  }
]
```

### **Get Hourly Averages**

```json
[
  {
    "$group": {
      "_id": {
        "$dateToString": {
          "format": "%Y-%m-%d %H:00",
          "date": "$timestamp"
        }
      },
      "avgTemp": { "$avg": "$temperature" },
      "avgHumidity": { "$avg": "$humidity" },
      "avgSoil": { "$avg": "$soilMoisture" },
      "count": { "$sum": 1 }
    }
  },
  {
    "$sort": { "_id": -1 }
  }
]
```

---

## 🚀 YOUR DATA FLOW

```
ESP32 → Backend → MongoDB → Dashboard
  ↓         ↓         ↓
  5s     Saves    Stores    
         Data    Forever   
                    ↓
              MongoDB Compass
              (View/Export)
```

**All sensor data is automatically stored in MongoDB!**  
**No manual intervention needed!**  
**Just connect Compass to view it!**

---

**Connection String:** `mongodb://localhost:27017/smart-agriculture`  
**Collection Name:** `sensordatas`  
**Auto-Stored:** ✅ Yes, every sensor reading!
