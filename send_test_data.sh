#!/bin/bash
# Send test sensor data to backend
BACKEND_URL="${1:-http://localhost:5001/api/sensors/data}"
TOKEN="krishi_sakha_device_secret_2026"

TEMP=$(awk -v min=24 -v max=32 'BEGIN{srand(); printf "%.1f", min+rand()*(max-min)}')
HUM=$(awk -v min=45 -v max=75 'BEGIN{srand(); printf "%.1f", min+rand()*(max-min)}')
SOIL=$(awk -v min=30 -v max=60 'BEGIN{srand(); printf "%.1f", min+rand()*(max-min)}')

echo "📡 Sending live sensor data: Temp=${TEMP}°C, Hum=${HUM}%, Soil=${SOIL}% to $BACKEND_URL"

curl -s -X POST "$BACKEND_URL" \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: $TOKEN" \
  -d "{
    \"temperature\": $TEMP,
    \"humidity\": $HUM,
    \"soilMoisture\": $SOIL,
    \"pH\": 6.8,
    \"rainLevel\": 0,
    \"rainfall\": 0,
    \"nitrogen\": 45,
    \"phosphorus\": 35,
    \"potassium\": 40,
    \"deviceId\": \"ESP32_SENSOR_001\",
    \"source\": \"esp32-wifi\"
  }"
echo ""
