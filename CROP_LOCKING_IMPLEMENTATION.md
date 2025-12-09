# Crop Locking Mechanism - Implementation Guide

## Overview
This document describes the complete implementation of the crop locking mechanism for Krishi Sakha, which prevents the system from changing crop recommendations once a farmer has confirmed their crop choice for a field/season.

---

## ✅ Implementation Summary

### 1. Data Model Changes

#### Field Model (`backend/models/Field.js`)
Added three new fields to track crop locking status:

```javascript
// Crop Locking Mechanism
lockedCrop: {
  type: String,
  default: null
},
isCropLocked: {
  type: Boolean,
  default: false
},
cropLockDate: {
  type: Date,
  default: null
}
```

**Benefits:**
- Non-breaking: All fields have default values
- Backward compatible: Existing fields continue to work
- Minimal: Only three fields added to existing schema

---

### 2. Backend API Changes

#### Enhanced Prediction Route (`backend/routes/predict.js`)

**New Logic Flow:**
1. Check if field has a locked crop before running predictions
2. If `isCropLocked === true`, return locked crop information
3. If not locked, proceed with normal ML prediction

**New Endpoints Added:**

##### Lock Crop
```
POST /api/predict/lock-crop/:fieldId
Body: { selectedCrop: "Rice" }
```
- Locks the selected crop for the specified field
- Sets `isCropLocked = true` and records `cropLockDate`

##### Unlock Crop
```
POST /api/predict/unlock-crop/:fieldId
```
- Unlocks the field to allow new crop predictions
- Sets `isCropLocked = false`

**Example API Response (Locked Crop):**
```json
{
  "message": "Crop is locked for this field",
  "lockedCrop": "Rice",
  "cropLockDate": "2024-12-06T15:30:00.000Z",
  "recommendationDisabled": true
}
```

---

### 3. Frontend Implementation

#### Crop Recommendation Page (`frontend/src/pages/farmer/CropRecommendation.jsx`)

**Key Features:**

1. **Locked Crop Display**
   - Shows locked crop name prominently
   - Displays lock date
   - Prevents running new predictions

2. **Change Crop Button**
   - Visible only when a crop is locked
   - Opens confirmation dialog before unlocking

3. **Lock Crop on Selection**
   - When farmer selects a recommended crop, it's automatically locked
   - Saves to both CropPlan and Field models

**UI Flow:**
```
┌─────────────────────────────────────┐
│  Field Selection Dropdown           │
├─────────────────────────────────────┤
│  🔒 Locked Crop: Rice              │
│  Locked on: 12/06/2024             │
│  [Change Crop Button]              │
└─────────────────────────────────────┘
        ↓ Click "Change Crop"
┌─────────────────────────────────────┐
│  ⚠️  Confirmation Dialog            │
│  "Are you sure you want to change  │
│   the crop for this field?"        │
│  [Cancel] [Confirm]                │
└─────────────────────────────────────┘
        ↓ Confirm
┌─────────────────────────────────────┐
│  ✅ Crop unlocked!                  │
│  You can now get new predictions   │
└─────────────────────────────────────┘
```

#### Fields List (`frontend/src/pages/farmer/FieldsList.jsx`)
- Shows lock icon (🔒) for locked fields
- Displays locked crop name
- Blue color scheme for locked crop info

#### Satellite Monitoring (`frontend/src/pages/farmer/SatelliteMonitoring.jsx`)
- Displays locked crop in field header
- Shows lock date

#### Farmer Dashboard (`frontend/src/pages/farmer/Dashboard.jsx`)
- Shows locked status in field overview cards
- Lock icon indicator

---

## 4. User Workflows

### Workflow 1: First-Time Crop Selection
```
1. Farmer selects field
2. System checks: isCropLocked = false
3. Farmer clicks "Get Recommendation"
4. ML model analyzes sensor data
5. System shows crop recommendations
6. Farmer clicks "Select" on preferred crop (e.g., "Rice")
7. System:
   - Saves to CropPlan collection
   - Locks crop: isCropLocked = true
   - Records: lockedCrop = "Rice", cropLockDate = now
8. ✅ Success message displayed
```

### Workflow 2: Viewing Locked Crop
```
1. Farmer navigates to Crop Recommendation
2. Selects a field with locked crop
3. System detects: isCropLocked = true
4. Shows:
   - "🔒 Locked Crop: Rice"
   - "Locked on: 12/06/2024"
   - "Change Crop" button
5. Recommendation button is disabled with message:
   "Crop Locked - Click 'Change Crop' to Unlock"
```

### Workflow 3: Changing Crop (New Season)
```
1. Farmer clicks "Change Crop" button
2. Confirmation dialog appears
3. Farmer confirms
4. System unlocks:
   - isCropLocked = false
   - lockedCrop = null
5. Recommendation button becomes active
6. Farmer can get new crop predictions
```

### Workflow 4: Irrigation Advice (Locked Crop)
```
1. Field has locked crop (e.g., Rice)
2. Farmer navigates to Smart Irrigation
3. System:
   - Reads live sensor data
   - Provides irrigation recommendations
   - Uses locked crop for context
4. NO crop prediction runs
5. ✅ Advisory continues normally
```

### Workflow 5: Live Sensor Monitoring (Always Active)
```
1. Farmer logs into dashboard
2. System displays:
   - 📡 Live Sensor Data section
   - Temperature, Humidity, Soil Moisture, pH
   - ESP32 connection status (if connected)
   - Last update timestamp
3. Real-time updates via WebSocket
4. Works REGARDLESS of crop lock status
5. Alerts shown if values are critical
```

---

## 14. Live Sensor Data Display

### Where Sensor Data Appears

Live sensor data is displayed in **multiple locations** throughout the application:

#### 1. Farmer Dashboard (`/farmer/dashboard`)
**📡 Live Sensor Data Section**
- Large, colorful cards showing each parameter
- Temperature (Red gradient card)
- Humidity (Blue gradient card)
- Soil Moisture (Green gradient card)
- pH Level (Purple gradient card)
- ESP32 connection indicator
- Last update timestamp

**Display:**
```
📡 Live Sensor Data         [ESP32 Connected ✅]

[🌡️ Temperature]  [💧 Humidity]  [🌱 Soil Moisture]  [⚗️ pH Level]
   28°C            70%            65%             6.5
```

#### 2. Crop Recommendation Page (`/farmer/crop-recommendation`)
**Current Conditions Section**
- Shows sensor data even when crop is locked
- Used for context with locked crop info
- Displayed above recommendation button

**When Locked:**
```
🔒 Locked Crop: Rice
Locked on: 12/06/2024
✅ Live monitoring active: Sensor data is being tracked
   for irrigation and advisory purposes.

Current Conditions:
  Temperature: 28°C | Humidity: 70%
  Soil Moisture: 65% | pH: 6.5
```

#### 3. Critical Alerts
- Automatically generated from sensor data
- Shown on dashboard when thresholds exceeded
- Examples:
  - ⚠️ Extreme heat detected! (temp > 40°C)
  - 💦 Soil moisture critically low! (< 30%)
  - 🧪 Soil pH outside optimal range!

### Real-Time Updates

**Via Socket.io:**
- Live sensor updates pushed to frontend
- No page refresh needed
- Connection status indicator
- Works with ESP32 hardware or simulated data

**Data Flow:**
```
ESP32 Sensor → Backend API → Socket.io → Frontend (Live Update)
                     ↓
                 MongoDB (Stored)
```

---

## 15. Feature Behavior Matrix

| Scenario | isCropLocked | Crop Prediction | Irrigation Advice | Sensor Data Display |
|----------|-------------|-----------------|-------------------|--------------------|
| New Field | `false` | ✅ Enabled | ✅ Enabled | ✅ Live Updates |
| After Locking | `true` | ❌ Disabled | ✅ Enabled | ✅ Live Updates |
| After Unlocking | `false` | ✅ Enabled | ✅ Enabled | ✅ Live Updates |

**Note:** Live sensor data (temperature, humidity, soil moisture, pH) is ALWAYS displayed and monitored regardless of crop lock status. The system continues to track environmental conditions for irrigation advice, disease detection, and alerts.

---

## 14. Technical Details

### Data Flow: Crop Locking

```
Frontend                    Backend                  Database
   │                          │                         │
   │  POST /predict/crop      │                         │
   │─────────────────────────>│                         │
   │                          │  Check Field.isCropLocked
   │                          │─────────────────────────>│
   │                          │<─────────────────────────│
   │                          │  (isCropLocked = true)  │
   │<─────────────────────────│                         │
   │  { recommendationDisabled: true, lockedCrop: "Rice" }
   │                          │                         │
```

### Data Flow: Lock Crop

```
Frontend                    Backend                  Database
   │                          │                         │
   │  Farmer selects "Rice"   │                         │
   │                          │                         │
   │  POST /crop-plans        │                         │
   │─────────────────────────>│                         │
   │                          │  Save CropPlan          │
   │                          │─────────────────────────>│
   │                          │                         │
   │  POST /predict/lock-crop │                         │
   │─────────────────────────>│                         │
   │                          │  Update Field:          │
   │                          │    isCropLocked = true  │
   │                          │    lockedCrop = "Rice"  │
   │                          │─────────────────────────>│
   │<─────────────────────────│                         │
   │  Success                 │                         │
```

---

## 15. Integration Points

### Existing Features NOT Affected
✅ Disease Check - Still works with current crop type
✅ Mandi Prices - Independent of field crop
✅ Labour Marketplace - No dependency
✅ Notifications - Continue to work
✅ Analytics - Uses historical data
✅ Satellite Monitoring - Field-based, not crop-based
✅ Fertilizer Optimization - Uses satellite data

### Features Enhanced
🌟 **Crop Recommendation** - Now respects locked crop
🌟 **Smart Irrigation** - Can use locked crop for better advice
🌟 **Field Management** - Shows lock status

---

## 14. Database Schema Reference

### Field Document (with Crop Lock)
```json
{
  "_id": "673abc123...",
  "name": "North Field",
  "farmerId": "673...",
  "areaHectares": 5.2,
  "cropType": "Rice",
  "soilType": "Loamy",
  "isCropLocked": true,
  "lockedCrop": "Rice",
  "cropLockDate": "2024-12-06T15:30:00.000Z",
  "boundary": { ... },
  "createdAt": "2024-11-15T10:00:00.000Z"
}
```

---

## 15. Testing Guide

### Manual Testing Steps

1. **Test Crop Locking**
   ```
   - Login as farmer
   - Go to Crop Recommendation
   - Select a field without locked crop
   - Get recommendation
   - Select a crop
   - Verify: Locked crop info appears
   - Verify: Recommendation button is disabled
   ```

2. **Test Crop Unlocking**
   ```
   - Navigate to field with locked crop
   - Click "Change Crop"
   - Confirm in dialog
   - Verify: Locked crop info disappears
   - Verify: Recommendation button is enabled
   ```

3. **Test Field List Display**
   ```
   - Navigate to Fields List
   - Verify: Locked fields show lock icon
   - Verify: Locked crop name is displayed
   ```

4. **Test Irrigation with Locked Crop**
   ```
   - Go to Smart Irrigation for locked field
   - Verify: Irrigation advice is provided
   - Verify: NO crop recommendation appears
   ```

---

## 14. API Reference

### Get Crop Recommendation
```http
POST /api/predict/crop
Authorization: Bearer <token>
Content-Type: application/json

{
  "temperature": 28,
  "humidity": 70,
  "soilMoisture": 65,
  "pH": 6.5,
  "fieldId": "673abc..."
}
```

**Response (Unlocked):**
```json
{
  "recommendedCrop": "Maize",
  "suitabilityScore": 92.5,
  "suitableCrops": [...],
  "regionalInsights": {...}
}
```

**Response (Locked):**
```json
{
  "message": "Crop is locked for this field",
  "lockedCrop": "Rice",
  "cropLockDate": "2024-12-06T15:30:00.000Z",
  "recommendationDisabled": true
}
```

### Lock Crop
```http
POST /api/predict/lock-crop/:fieldId
Authorization: Bearer <token>
Content-Type: application/json

{
  "selectedCrop": "Rice"
}
```

### Unlock Crop
```http
POST /api/predict/unlock-crop/:fieldId
Authorization: Bearer <token>
```

---

## 15. Acceptance Criteria ✅

All requirements met:

- ✅ Field with no locked crop → System predicts crops normally
- ✅ After farmer confirms crop → Crop stays fixed
- ✅ System doesn't recalculate crop suggestions automatically
- ✅ Irrigation and advisory continue based on live data
- ✅ Only explicit "Change Crop" action allows new prediction
- ✅ Minimal changes to existing code
- ✅ No breaking changes to APIs
- ✅ Clean, readable function names
- ✅ Reuses existing UI components and styles

---

## 14. Access Information

**Application URLs:**
- Frontend: http://localhost:5174
- Backend API: http://localhost:5001

**Test Account:**
- Email: testfarmer@example.com
- Password: test123
- Role: Farmer

---

## 15. Troubleshooting

### Issue: After login, nothing shows
**Solution:** 
- Clear browser cache and localStorage
- Check browser console for errors
- Verify backend is running on port 5001
- Verify frontend is running on correct port

### Issue: Crop lock button doesn't work
**Solution:**
- Check authentication token
- Verify field ownership
- Check network tab for API errors

### Issue: Can't unlock crop
**Solution:**
- Ensure user owns the field
- Check database for field record
- Verify API endpoint is accessible

---

## Summary

The crop locking mechanism is fully implemented and working. The system:
1. ✅ Prevents crop changes after farmer confirmation
2. ✅ Continues to provide irrigation and advisory
3. ✅ Allows manual unlocking for new seasons
4. ✅ Maintains all existing functionality
5. ✅ Uses clean, minimal code changes
6. ✅ Provides excellent user experience

The implementation is production-ready and follows all the requirements specified.
