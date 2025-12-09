#!/bin/bash

echo "🧪 Sending TEST sensor data to verify system works..."
echo ""

curl -X POST http://localhost:5001/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 32.5,
    "humidity": 78.2,
    "soilMoisture": 68.3,
    "pH": 6.7,
    "rainfall": 15.5,
    "deviceId": "ESP32_SENSOR_001",
    "source": "krishi-sakha"
  }'

echo ""
echo ""
echo "✅ TEST DATA SENT!"
echo ""
echo "🔍 NOW CHECK YOUR DASHBOARD:"
echo "   - Should show: Temperature 32.5°C"
echo "   - Should show: Humidity 78.2%"
echo "   - Should show: Soil 68.3%"
echo "   - Should show: Green ESP32 Connected badge"
echo "   - Should show: Toast notification"
echo ""
echo "⏰ Data should appear within 1 second!"
echo ""
