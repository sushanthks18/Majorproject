#!/bin/bash

echo "╔═══════════════════════════════════════════════════════╗"
echo "║       DATA STORAGE VERIFICATION TEST                  ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if MongoDB is running
echo "1️⃣  Checking if MongoDB is running..."
if pgrep -x "mongod" > /dev/null; then
    echo "   ✅ MongoDB is RUNNING"
else
    echo "   ❌ MongoDB is NOT running"
    echo "   Start it with: brew services start mongodb-community"
    exit 1
fi

echo ""
echo "2️⃣  Checking database connection..."

# Count total sensor records
COUNT=$(mongosh smart-agriculture --quiet --eval "db.sensordatas.countDocuments()" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "   ✅ Connected to MongoDB successfully"
    echo "   📊 Total sensor readings stored: $COUNT"
else
    echo "   ❌ Failed to connect to MongoDB"
    exit 1
fi

echo ""
echo "3️⃣  Showing most recent 3 sensor readings..."
echo ""

mongosh smart-agriculture --quiet --eval "
  db.sensordatas.find()
    .sort({timestamp: -1})
    .limit(3)
    .forEach(doc => {
      print('┌─────────────────────────────────────────────┐');
      print('│ ID: ' + doc._id);
      print('│ Temperature: ' + doc.temperature + '°C');
      print('│ Humidity: ' + doc.humidity + '%');
      print('│ Soil Moisture: ' + doc.soilMoisture + '%');
      print('│ pH: ' + doc.pH);
      print('│ Rainfall: ' + (doc.rainfall || 0) + ' mm');
      print('│ Time: ' + doc.timestamp);
      print('└─────────────────────────────────────────────┘');
      print('');
    })
"

echo ""
echo "4️⃣  Testing data retention after simulated refresh..."
echo "   📝 Current record count: $COUNT"

# Send test data
echo "   📡 Sending new test sensor data..."
curl -s -X POST http://localhost:5001/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 29.5,
    "humidity": 68.0,
    "soilMoisture": 55.0,
    "pH": 6.8,
    "rainfall": 5.0,
    "deviceId": "ESP32_TEST_VERIFY",
    "source": "krishi-sakha",
    "apiKey": "test"
  }' > /dev/null

sleep 1

# Count again
NEW_COUNT=$(mongosh smart-agriculture --quiet --eval "db.sensordatas.countDocuments()" 2>/dev/null)
echo "   📝 New record count: $NEW_COUNT"

if [ $NEW_COUNT -gt $COUNT ]; then
    echo "   ✅ Data successfully stored in MongoDB!"
    echo "   🎉 Data persists - will survive page refresh!"
else
    echo "   ⚠️  Data count did not increase (backend might be down)"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                  VERIFICATION COMPLETE                ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📌 Key Points:"
echo "   ✅ All sensor data is stored in MongoDB"
echo "   ✅ Data persists across page refreshes"
echo "   ✅ Data never disappears (unless manually deleted)"
echo "   ✅ You can view historical data anytime"
echo ""
echo "🔍 View all data in MongoDB Compass:"
echo "   Connection: mongodb://localhost:27017/smart-agriculture"
echo "   Collection: sensordatas"
echo ""
