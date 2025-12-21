#!/bin/bash

echo "Testing Crop Recommendation API..."
echo ""

# Login first
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer1@test.com","password":"password123","role":"farmer"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Test recommendation
echo "Step 2: Getting crop recommendation..."
echo ""

RECOMMENDATION_RESPONSE=$(curl -s -X POST http://localhost:5001/api/predict/crop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "temperature": 26.47,
    "humidity": 77.59,
    "soilMoisture": 0,
    "pH": 9.09,
    "rainfall": 0,
    "useAggregated": true
  }')

echo "$RECOMMENDATION_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RECOMMENDATION_RESPONSE"
