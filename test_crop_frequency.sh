#!/bin/bash

echo "🧪 Testing Crop Frequency Insight Feature"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5001/api"

echo "📋 Test 1: Save Crop Predictions"
echo "--------------------------------"

# Save prediction for farmer1 - Wheat
echo "Saving: farmer001 → Wheat (3.5 ha)"
curl -s -X POST $BASE_URL/crops/savePrediction \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "farmer001",
    "predictedCrop": "Wheat",
    "area": 3.5,
    "region": "Tumkur",
    "season": "Rabi 2025"
  }' | json_pp

echo ""

# Save prediction for farmer2 - Wheat
echo "Saving: farmer002 → Wheat (2.0 ha)"
curl -s -X POST $BASE_URL/crops/savePrediction \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "farmer002",
    "predictedCrop": "Wheat",
    "area": 2.0,
    "region": "Tumkur",
    "season": "Rabi 2025"
  }' | json_pp

echo ""

# Save prediction for farmer3 - Rice
echo "Saving: farmer003 → Rice (4.0 ha)"
curl -s -X POST $BASE_URL/crops/savePrediction \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "farmer003",
    "predictedCrop": "Rice",
    "area": 4.0,
    "region": "Tumkur",
    "season": "Rabi 2025"
  }' | json_pp

echo ""

# Save prediction for farmer4 - Wheat
echo "Saving: farmer004 → Wheat (1.5 ha)"
curl -s -X POST $BASE_URL/crops/savePrediction \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "farmer004",
    "predictedCrop": "Wheat",
    "area": 1.5,
    "region": "Tumkur",
    "season": "Rabi 2025"
  }' | json_pp

echo ""
echo "=========================================="
echo ""

echo "📊 Test 2: Query Crop Frequency for Wheat"
echo "-----------------------------------------"
curl -s "$BASE_URL/crops/frequency?region=Tumkur&season=Rabi%202025&crop=Wheat" | json_pp

echo ""
echo "=========================================="
echo ""

echo "📊 Test 3: Query Crop Frequency for Rice"
echo "----------------------------------------"
curl -s "$BASE_URL/crops/frequency?region=Tumkur&season=Rabi%202025&crop=Rice" | json_pp

echo ""
echo "=========================================="
echo ""

echo "✅ Test Complete!"
echo ""
echo "Expected Results:"
echo "- Wheat: 3 out of 4 farmers (75%) → Very High Competition"
echo "- Rice: 1 out of 4 farmers (25%) → Low Competition"
echo ""
echo "🌐 Open crop_frequency_dashboard.html to see the UI"
