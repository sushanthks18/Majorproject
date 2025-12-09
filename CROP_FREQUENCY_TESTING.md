# ✅ Crop Frequency Insight - Testing Checklist

## Pre-Testing Setup

### ✅ Prerequisites
- [ ] Backend server running on port 5001
- [ ] Frontend running on port 5174
- [ ] MongoDB connection active
- [ ] At least 1 farmer account exists
- [ ] At least 1 field registered with district/taluk data

---

## 🧪 Test Suite

### Test 1: Basic Functionality ✅

**Objective:** Verify the feature appears and displays data

**Steps:**
1. [ ] Login as farmer
2. [ ] Navigate to Crop Recommendation page
3. [ ] Select a field from dropdown
4. [ ] Click "Get Recommendation" button
5. [ ] Wait for prediction to load
6. [ ] Verify: Crop Frequency Insight panel appears below recommended crop
7. [ ] Verify: Panel shows statistics (farmers count, percentage)
8. [ ] Verify: Risk indicator is color-coded (green/yellow/red)

**Expected Result:**
```
✅ Top Recommended Crop: [Crop Name]
✅ Crop Frequency Insight panel visible
✅ Statistics display: X farmers out of Y
✅ Frequency percentage shown
✅ Risk indicator with appropriate color
✅ Insight message displayed
✅ Recommendation text shown
```

**Backend Log Expected:**
```
📊 [Crop Frequency Insight] Analyzing: Rice
✅ Crop frequency analysis completed: { crop: 'Rice', farmers: 18, total: 45, percentage: '40%', risk: 'high' }
```

**Frontend Console Expected:**
```
🔍 Fetching crop frequency for: Rice
✅ Crop frequency data loaded: { cropName: 'Rice', statistics: {...} }
```

---

### Test 2: Risk Level Colors 🎨

**Objective:** Verify correct color coding based on frequency

**Test Cases:**

#### 2.1: High Competition (Red) 🔴
- [ ] Ensure crop has ≥40% frequency
- [ ] Verify background is red (`bg-red-50`)
- [ ] Verify icon is `AlertTriangle` in red
- [ ] Verify message: "Very High Competition" or "High Competition"

#### 2.2: Medium Competition (Yellow) 🟡
- [ ] Ensure crop has 15-24% frequency
- [ ] Verify background is yellow (`bg-yellow-50`)
- [ ] Verify icon is `Info` in yellow
- [ ] Verify message: "Moderate Competition"

#### 2.3: Low Competition (Green) 🟢
- [ ] Ensure crop has <15% frequency
- [ ] Verify background is green (`bg-green-50`)
- [ ] Verify icon is `CheckCircle` in green
- [ ] Verify message: "Low Competition" or "Minimal Competition"

**How to Test:**
- Create multiple farmer accounts
- Lock different percentages of crops in same region
- Observe color changes as frequency increases

---

### Test 3: Statistics Accuracy 📊

**Objective:** Verify calculations are correct

**Manual Verification:**

1. [ ] Query MongoDB directly:
```javascript
use smart-agriculture;
db.cropplans.find({
  year: 2024,
  season: "kharif",
  "region.district": "Dharwad",
  status: { $in: ["planned", "sowing", "growing"] }
})
```

2. [ ] Count manually:
   - Total unique farmers: `[ ]` (count)
   - Farmers with same crop: `[ ]` (count)
   - Expected percentage: `[ ]` (calculate)

3. [ ] Compare with UI display:
   - [ ] Farmers count matches
   - [ ] Percentage matches
   - [ ] Total area matches

**Formula Verification:**
```
frequencyPercentage = (farmersWithSameCrop / totalFarmers) * 100
```

---

### Test 4: Regional Filtering 🗺️

**Objective:** Verify data is filtered by region

**Setup:**
- Create fields in different districts (e.g., Dharwad, Belgaum, Hubli)
- Lock crops for each field

**Steps:**
1. [ ] Select field from District A
2. [ ] Get crop recommendation
3. [ ] Note the farmer count
4. [ ] Switch to field from District B
5. [ ] Get crop recommendation for same crop
6. [ ] Verify: Farmer count is different (region-specific)

**Expected Behavior:**
- District A shows only farmers in District A
- District B shows only farmers in District B
- Same crop, different frequencies in different regions

---

### Test 5: Season & Year Filtering 📅

**Objective:** Verify data respects current season and year

**Steps:**
1. [ ] Check current month to determine season:
   - June-October → Kharif
   - November-March → Rabi
   - April-May → Zaid

2. [ ] Create crop plans for different seasons
3. [ ] Get recommendation
4. [ ] Verify: Only current season plans are counted

**MongoDB Query to Verify:**
```javascript
db.cropplans.find({
  season: { $in: ["kharif", "year-round"] }, // Current season
  year: 2024 // Current year
})
```

---

### Test 6: Top Competing Crops 🏆

**Objective:** Verify top crops list is accurate

**Steps:**
1. [ ] Create diverse crop plans in same region:
   - Rice: 18 farmers
   - Wheat: 12 farmers
   - Maize: 8 farmers
   - Others: 7 farmers

2. [ ] Get recommendation for any crop
3. [ ] Verify: Top competing crops section shows:
   - [ ] Top 5 crops (or less if fewer exist)
   - [ ] Crops sorted by farmer count (descending)
   - [ ] Each crop shows: name, percentage, farmer count

**Expected Display:**
```
Top Crops in Your Region:
• Rice (40%) 18 farmers
• Wheat (26.67%) 12 farmers
• Maize (17.78%) 8 farmers
```

---

### Test 7: Progress Bar Visual 📏

**Objective:** Verify progress bar reflects frequency

**Steps:**
1. [ ] Get recommendation with known frequency (e.g., 40%)
2. [ ] Verify progress bar width matches percentage
3. [ ] Verify progress bar color matches risk level
   - Red for high (≥40%)
   - Yellow for medium (15-24%)
   - Green for low (<15%)

**Visual Check:**
- [ ] Bar fills to correct width (40% should fill 40% of container)
- [ ] Color matches risk indicator
- [ ] Labels show "Low Competition" ↔ "High Competition"

---

### Test 8: Edge Cases 🔍

#### 8.1: First Farmer in Region
**Scenario:** No other farmers have locked crops yet

**Expected:**
- [ ] Total farmers: 1 (just you)
- [ ] Farmers with same crop: 1
- [ ] Frequency: 100%
- [ ] Color: Red (very high competition - only one crop!)

#### 8.2: No Crop Plans Exist
**Scenario:** Fresh database, no crop plans

**Expected:**
- [ ] Total farmers: 0
- [ ] Frequency: 0%
- [ ] Panel may not show or show "0 farmers"
- [ ] No crash or error

#### 8.3: Rare Crop
**Scenario:** You're the only one growing exotic vegetable

**Expected:**
- [ ] Farmers with same crop: 1
- [ ] Frequency: Very low percentage
- [ ] Color: Green
- [ ] Message: "Excellent market opportunity"

#### 8.4: All Farmers Same Crop
**Scenario:** Every farmer in region locked same crop

**Expected:**
- [ ] Frequency: 100%
- [ ] Color: Red
- [ ] Message: "Very High Competition"

---

### Test 9: Multiple Farmers Simulation 👥

**Objective:** Test with realistic data

**Setup Script:**
1. Create 10 test farmer accounts
2. Register fields for each in same district
3. Lock crops in this distribution:
   - Rice: 4 farmers (40%)
   - Wheat: 3 farmers (30%)
   - Maize: 2 farmers (20%)
   - Tomato: 1 farmer (10%)

**Verification:**
- [ ] Rice shows 40% → Red
- [ ] Wheat shows 30% → Orange
- [ ] Maize shows 20% → Yellow
- [ ] Tomato shows 10% → Green

---

### Test 10: API Testing 🔌

**Direct API Test (Using curl or Postman):**

```bash
# Get authentication token first
TOKEN="your_jwt_token_here"

# Test crop frequency endpoint
curl -X GET \
  "http://localhost:5001/api/crop-plans/crop-frequency/Rice?district=Dharwad&taluk=Hubli" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "cropName": "Rice",
  "region": {
    "district": "Dharwad",
    "taluk": "Hubli"
  },
  "season": "kharif",
  "year": 2024,
  "statistics": {
    "totalFarmers": 45,
    "farmersWithSameCrop": 18,
    "frequencyPercentage": 40.0,
    "totalAreaForCrop": 92.4,
    "areaPercentage": 35.5
  },
  "insight": {
    "trendDescription": "Very High Competition",
    "riskLevel": "high",
    "insight": "⚠️ High demand crop — many farmers are planning to grow this.",
    "recommendation": "Risk of market oversupply — consider diversification to other crops for better market opportunity.",
    "colorCode": "red"
  },
  "topCompetingCrops": [...]
}
```

**Verify:**
- [ ] Status code: 200
- [ ] Response has all required fields
- [ ] Statistics are numbers (not strings)
- [ ] Percentage is between 0-100

---

### Test 11: Performance Testing ⚡

**Objective:** Ensure feature doesn't slow down the app

**Metrics to Check:**

1. [ ] **API Response Time**
   - Open browser DevTools → Network tab
   - Trigger crop frequency request
   - Response time should be <200ms
   - If >500ms, check MongoDB indexes

2. [ ] **UI Rendering Time**
   - Panel should appear immediately after data loads
   - No visible lag or freezing

3. [ ] **Memory Usage**
   - Check browser Task Manager
   - Memory should not increase significantly

---

### Test 12: Error Handling 🚨

**Test various failure scenarios:**

#### 12.1: Backend Down
- [ ] Stop backend server
- [ ] Get crop recommendation
- [ ] Verify: Frequency panel doesn't show (graceful failure)
- [ ] Verify: No error toast shown to user
- [ ] Console should log error (not visible to user)

#### 12.2: Invalid Crop Name
```bash
curl -X GET \
  "http://localhost:5001/api/crop-plans/crop-frequency/InvalidCrop123" \
  -H "Authorization: Bearer $TOKEN"
```
- [ ] Should return 0 farmers
- [ ] Should not crash

#### 12.3: No District in Field
- [ ] Create field without district/taluk
- [ ] Get recommendation
- [ ] Verify: Shows "All districts" in region display
- [ ] Should query entire database (not filtered)

---

### Test 13: Integration with Existing Features 🔗

**Verify no interference with existing functionality:**

- [ ] Sensor monitoring still works
- [ ] Crop prediction still works
- [ ] Crop locking still works
- [ ] Field management still works
- [ ] Dashboard loads normally
- [ ] Analytics page unaffected
- [ ] Mandi prices still load

**Critical:** Get crop recommendation and verify:
1. Prediction appears first
2. Frequency panel appears second
3. Alternative crops still visible
4. Lock crop button still works
5. Can still unlock crop

---

## 🐛 Troubleshooting Guide

### Issue 1: Panel Doesn't Appear

**Checks:**
- [ ] Open browser console (F12)
- [ ] Look for errors
- [ ] Check if `fetchCropFrequency()` was called
- [ ] Verify crop prediction succeeded first
- [ ] Check backend logs for frequency endpoint hit

**Solution:**
- Ensure backend is running
- Check if field has district/taluk data
- Verify MongoDB connection

---

### Issue 2: Wrong Statistics

**Checks:**
- [ ] Query MongoDB directly to count
- [ ] Verify season calculation is correct
- [ ] Check if old crop plans exist from past seasons
- [ ] Ensure status filter is working

**Solution:**
```javascript
// Clean up old test data
db.cropplans.deleteMany({ year: { $lt: 2024 } });

// Verify active plans
db.cropplans.find({ 
  status: { $in: ["planned", "sowing", "growing"] }
}).count();
```

---

### Issue 3: Color Not Changing

**Checks:**
- [ ] Verify `cropFrequency.insight.colorCode` value in state
- [ ] Check CSS classes are correct
- [ ] Ensure Tailwind classes are compiled

**Debug:**
```javascript
// Add to fetchCropFrequency() after setting state:
console.log('Color code:', cropFrequency?.insight?.colorCode);
console.log('Risk level:', cropFrequency?.insight?.riskLevel);
```

---

## 📊 Test Results Template

```
┌─────────────────────────────────────────────────────────────┐
│              CROP FREQUENCY INSIGHT TEST REPORT              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Date: _______________                                        │
│ Tester: _____________                                        │
│ Environment: [Dev / Production]                              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                        TEST RESULTS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ Test 1: Basic Functionality            [Pass / Fail]     │
│ ✅ Test 2: Risk Level Colors              [Pass / Fail]     │
│ ✅ Test 3: Statistics Accuracy            [Pass / Fail]     │
│ ✅ Test 4: Regional Filtering             [Pass / Fail]     │
│ ✅ Test 5: Season & Year Filtering        [Pass / Fail]     │
│ ✅ Test 6: Top Competing Crops            [Pass / Fail]     │
│ ✅ Test 7: Progress Bar Visual            [Pass / Fail]     │
│ ✅ Test 8: Edge Cases                     [Pass / Fail]     │
│ ✅ Test 9: Multiple Farmers Simulation    [Pass / Fail]     │
│ ✅ Test 10: API Testing                   [Pass / Fail]     │
│ ✅ Test 11: Performance Testing           [Pass / Fail]     │
│ ✅ Test 12: Error Handling                [Pass / Fail]     │
│ ✅ Test 13: Integration                   [Pass / Fail]     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                          SUMMARY                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Total Tests: 13                                              │
│ Passed: ____                                                 │
│ Failed: ____                                                 │
│ Skipped: ____                                                │
│                                                              │
│ Overall Status: [✅ Ready / ⚠️ Needs Fixes / ❌ Critical]   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                          ISSUES FOUND                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. ___________________________________________________      │
│                                                              │
│ 2. ___________________________________________________      │
│                                                              │
│ 3. ___________________________________________________      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Smoke Test (5 minutes)

**For rapid verification after deployment:**

1. [ ] Login → Crop Recommendation → Get Recommendation
2. [ ] Verify frequency panel appears
3. [ ] Lock crop → Create new farmer → Lock different crop
4. [ ] Refresh first farmer → Get recommendation
5. [ ] Verify statistics updated

**If all 5 steps pass → Feature is working ✅**

---

## 📞 Support Checklist

Before asking for help:

- [ ] Checked browser console for errors
- [ ] Checked backend logs
- [ ] Verified MongoDB connection
- [ ] Cleared browser cache
- [ ] Restarted backend/frontend
- [ ] Checked all 5 steps in Quick Smoke Test

---

**Test Status:** Ready for execution  
**Last Updated:** December 6, 2024
