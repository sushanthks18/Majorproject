#!/bin/bash
# ESP32 Live Sensor Data Testing Script
# This script simulates ESP32 sending sensor data to test the system

echo "🧪 KRISHI SAKHA - ESP32 SENSOR DATA TEST"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://localhost:5001"
SENSOR_ENDPOINT="$SERVER_URL/api/sensors/data"
LATEST_ENDPOINT="$SERVER_URL/api/sensors/latest"

echo -e "${BLUE}📡 Step 1: Testing Backend Connectivity${NC}"
echo "----------------------------------------"
if curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL" | grep -q "404\|200"; then
    echo -e "${GREEN}✅ Backend is running on port 5001${NC}"
else
    echo -e "${YELLOW}❌ Backend is NOT running. Please start it with: cd backend && npm run dev${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}📥 Step 2: Sending Test Sensor Data${NC}"
echo "----------------------------------------"
echo "Simulating ESP32 sensor readings..."
echo ""

# Test 1: Normal conditions
echo "Test 1: Normal farm conditions"
curl -X POST "$SENSOR_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 28.5,
    "humidity": 65.0,
    "soilMoisture": 55.0,
    "pH": 6.8,
    "rainfall": 10.0,
    "deviceId": "ESP32_SENSOR_001",
    "source": "krishi-sakha"
  }' 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ SUCCESS' if data.get('success') else '❌ FAILED'); print(f\"   Temperature: {data['data']['temperature']}°C\"); print(f\"   Humidity: {data['data']['humidity']}%\"); print(f\"   Soil Moisture: {data['data']['soilMoisture']}%\")"

sleep 3
echo ""

# Test 2: High temperature
echo "Test 2: High temperature scenario"
curl -X POST "$SENSOR_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 35.2,
    "humidity": 45.0,
    "soilMoisture": 30.0,
    "pH": 7.2,
    "rainfall": 2.0,
    "deviceId": "ESP32_SENSOR_001",
    "source": "krishi-sakha"
  }' 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ SUCCESS' if data.get('success') else '❌ FAILED'); print(f\"   Temperature: {data['data']['temperature']}°C (Hot!)\"); print(f\"   Soil Moisture: {data['data']['soilMoisture']}% (Dry!)\")"

sleep 3
echo ""

# Test 3: Rainy conditions
echo "Test 3: Rainy weather conditions"
curl -X POST "$SENSOR_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 24.8,
    "humidity": 85.0,
    "soilMoisture": 75.0,
    "pH": 6.5,
    "rainfall": 45.0,
    "deviceId": "ESP32_SENSOR_001",
    "source": "krishi-sakha"
  }' 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print('✅ SUCCESS' if data.get('success') else '❌ FAILED'); print(f\"   Rainfall: {data['data']['rainfall']}% (Heavy rain!)\"); print(f\"   Humidity: {data['data']['humidity']}% (Very humid!)\")"

sleep 2
echo ""

echo -e "${BLUE}📊 Step 3: Verifying Latest Data${NC}"
echo "----------------------------------------"
echo "Fetching most recent sensor reading..."
echo ""

curl -s "$LATEST_ENDPOINT" | python3 -c "
import sys, json
from datetime import datetime

data = json.load(sys.stdin)
print('Latest Sensor Reading:')
print('─' * 40)
print(f\"🌡️  Temperature:   {data['temperature']}°C\")
print(f\"💧 Humidity:      {data['humidity']}%\")
print(f\"🌱 Soil Moisture: {data['soilMoisture']}%\")
print(f\"🧪 pH Level:      {data['pH']}\")
print(f\"🌧️  Rainfall:      {data['rainfall']}%\")
print(f\"⏰ Timestamp:     {data['timestamp'][:19].replace('T', ' ')}\")
print('─' * 40)
"

echo ""
echo -e "${BLUE}🔌 Step 4: WebSocket Verification${NC}"
echo "----------------------------------------"
echo "The backend should have broadcasted data to all connected clients."
echo "Check your browser console for messages like:"
echo "  📡 Received sensor update: {...}"
echo "  ✅ Live ESP32 data: {...}"
echo ""

echo -e "${GREEN}✅ TEST COMPLETE!${NC}"
echo "=================="
echo ""
echo "Next Steps:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Login as a farmer"
echo "3. Check the Dashboard - you should see:"
echo "   ✅ Green 'ESP32 Connected' badge"
echo "   ✅ Latest sensor values displayed"
echo "   ✅ Toast notification with sensor data"
echo "4. Go to Crop Recommendation and click 'Predict Best Crop'"
echo "   ✅ Should use the live sensor data"
echo "5. Go to Disease Check page"
echo "   ✅ Should display live sensor readings"
echo ""
echo "To run this test again: bash test_esp32_data.sh"
echo ""
