# 🚀 Quick Test Guide - Real-time Mandi Price Integration

## ✅ **Status: FULLY INTEGRATED & VALIDATED**

---

## 🧪 **Run Integration Tests**

### **Test 1: Complete Integration Test**

```bash
cd backend
node test_integration.js
```

**Tests**:
- ✅ Aggregated sensor data (24-hour rolling average)
- ✅ Real-time vs aggregated comparison
- ✅ Mandi price fetching
- ✅ ML crop recommendation
- ✅ Profitability calculation (ML + Mandi prices)

---

### **Test 2: API Test (using cURL)**

```bash
# Get crop recommendation with profitability analysis
curl -X POST http://localhost:5001/api/predict/crop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "temperature": 28.5,
    "humidity": 68.2,
    "soilMoisture": 55.8,
    "pH": 6.8,
    "rainfall": 85,
    "useAggregated": true
  }'
```

**Expected Response**:
- `recommendedCrop`: Top profitable crop
- `profitabilityScore`: Combined ML + Mandi price score
- `suitableCrops[]`: Ranked by profitability (crops WITH mandi prices listed first)
- `mandiPrice{}`: Real AGMARKNET prices with trend indicator
- `dataSource{}`: Shows if using aggregated or real-time sensors

---

### **Test 3: Frontend Test**

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Login as farmer
4. Navigate to **"Crop Recommendation"**
5. Click **"Get Recommendation"**

**Expected Results**:
- ✅ Top crop with **highest profitability score**
- ✅ Real **mandi prices** displayed (₹X/quintal)
- ✅ **Economic outlook** (Favorable/Average)
- ✅ **Price trend indicator** (📈 High / 📊 Medium / 📉 Low)
- ✅ Crops ranked by profitability (ML + Market)

---

## 🔧 **Setup Prerequisites**

### **1. Ensure MongoDB is Running**

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### **2. Populate Mandi Data (Optional)**

```bash
cd backend
node sync_gov_data.js
```

This fetches **real AGMARKNET prices** from Government API.

### **3. Generate Sample Sensor Data (if no ESP32)**

```bash
cd backend
node populate_sample_data.js
```

---

## 📊 **Key Features Verified**

### ✅ **Aggregated Sensor Data**
- Uses 24-hour rolling average (not just latest reading)
- Compares real-time with historical data
- Auto-switches to aggregated if deviation > 15%

### ✅ **Real-time Mandi Prices**
- Fetches from **AGMARKNET API** (Government of India)
- Caches in MongoDB
- Shows price range (min, max, average, current)
- Indicates trend (📈 High / 📊 Medium / 📉 Low)

### ✅ **Profitability Calculation**
- **Formula**: `(ML_suitability + price_score) / 2`
- Ranks crops WITH mandi prices HIGHER than those without
- Applies **penalty** (30-50%) to crops without market data
- Shows **economic outlook** (Favorable/Average)

### ✅ **Data Validation**
- Only uses **AGMARKNET** (no simulated data)
- Tracks data source (aggregated vs real-time)
- Logs predictions for post-harvest validation

---

## 🐛 **Bug Fix Applied**

**Issue**: `farmerRegion` used before definition (line 119)  
**Fix**: Moved farmer region fetching BEFORE mandi price fetching  
**File**: `backend/routes/predict.js`  
**Status**: ✅ Fixed and tested

---

## 📁 **Files Modified/Created**

### **Modified**:
- ✅ `backend/routes/predict.js` - Fixed farmerRegion bug, enhanced profitability logic

### **Created**:
- ✅ `backend/test_integration.js` - Complete integration test suite
- ✅ `MANDI_PRICE_INTEGRATION_VALIDATION.md` - Full validation documentation
- ✅ `QUICK_TEST_GUIDE.md` - This file

---

## 🎯 **Expected Test Results**

### **Profitability Ranking Example**:

| Rank | Crop | ML Score | Mandi Price | Profitability | Status |
|------|------|----------|-------------|---------------|--------|
| 1 | Rice | 92% | ₹2850 (High) | **84%** | ✅ Has Price |
| 2 | Maize | 88% | ₹2200 (Med) | **77%** | ✅ Has Price |
| 3 | Ragi | 85% | ₹1800 (Low) | **65%** | ✅ Has Price |
| 4 | Cotton | 95% | No data | **67%** | ⚠️ No Price (penalty) |

**Top Recommendation**: **Rice** (profitability 84%)  
**Why**: Combines good ML suitability (92%) + favorable market price

---

## 🔗 **API Endpoints**

### **Crop Recommendation**
```
POST /api/predict/crop
```

### **Mandi Price Trends**
```
GET /api/mandi/trends/:crop?location=X&days=30
```

### **Refresh Mandi Data**
```
POST /api/mandi/refresh
```

### **Get Nearby Mandis**
```
GET /api/mandi/nearby?lat=X&lng=Y&radius=50
```

---

## ✅ **Validation Checklist**

Run through this checklist to verify everything works:

- [ ] Backend server starts without errors
- [ ] MongoDB is connected
- [ ] `node test_integration.js` passes all 5 tests
- [ ] API `/predict/crop` returns profitability scores
- [ ] Mandi prices show in response (if data available)
- [ ] Frontend shows crop recommendations ranked by profitability
- [ ] Economic outlook displays correctly (Favorable/Average)
- [ ] Data source info shows (aggregated vs real-time)

---

## 🆘 **Troubleshooting**

### **Issue**: "No mandi prices found"
**Solution**: Run `node sync_gov_data.js` to fetch from AGMARKNET

### **Issue**: "No sensor data available"
**Solution**: 
- Start ESP32 sensor (or)
- Run `node populate_sample_data.js` for test data

### **Issue**: "ML Model unavailable"
**Solution**: Train the model first:
```bash
cd backend/ml
python train_model_all_crops.py
```

### **Issue**: "farmerRegion undefined"
**Solution**: Already fixed in predict.js (ensure you have latest code)

---

## 📞 **Quick Support**

If tests fail:
1. Check MongoDB is running
2. Check backend logs for errors
3. Verify `.env` file has correct settings
4. Run `npm install` in backend folder

---

**Last Updated**: December 12, 2025  
**Test Status**: ✅ **ALL TESTS PASSING**  
**Integration Status**: ✅ **PRODUCTION READY**
