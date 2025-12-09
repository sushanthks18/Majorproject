# 🌾 Crop Frequency Insight - Integration Instructions

## ✅ What Was Created

### 1. **Mongoose Model** (`backend/models/CropPrediction.js`)
- Simple schema for storing crop predictions
- Fields: farmerId, predictedCrop, area, region, season, timestamp
- Optimized indexes for fast queries

### 2. **API Routes** (`backend/routes/crops.js`)
Three endpoints:
- `POST /api/crops/savePrediction` - Save prediction to MongoDB
- `GET /api/crops/frequency` - Get frequency statistics (LIVE from DB)
- `GET /api/crops/all` - View all predictions (debugging)

### 3. **HTML Dashboard** (`crop_frequency_dashboard.html`)
- Standalone HTML/CSS/JavaScript dashboard
- No React dependencies
- Pulls data from API (no hardcoded values)
- Works for Tumkur region, Rabi 2025 season

---

## 🔧 Integration Steps

### Step 1: Backend Already Integrated ✅

The new routes are already added to `backend/index.js`:
```javascript
import cropRoutes from './routes/crops.js';
app.use('/api/crops', cropRoutes);
```

**No further action needed!**

---

### Step 2: Call `savePrediction` from Your ML Prediction Handler

#### Option A: From Your Existing ML Route

Find your crop prediction route (likely in `backend/routes/predict.js` or similar).

After the ML model returns a predicted crop, add this code:

```javascript
// Example: Your existing prediction code
const mlPrediction = await predictCrop(temperature, humidity, soilMoisture, pH, rainfall);

// 🆕 NEW: Save prediction to MongoDB for frequency insight
try {
  const CropPrediction = (await import('../models/CropPrediction.js')).default;
  
  await CropPrediction.create({
    farmerId: req.user?.id || 'farmer123',  // Use actual farmer ID from auth
    predictedCrop: mlPrediction.recommendedCrop,  // From your ML model
    area: req.body.area || 2.5,  // Get from request or default
    region: 'Tumkur',  // Hardcode or get from farmer's field
    season: 'Rabi 2025'  // Hardcode or calculate dynamically
  });
  
  console.log('✅ Prediction saved for frequency analysis');
} catch (error) {
  console.error('⚠️ Failed to save prediction for frequency (non-critical):', error.message);
  // Don't fail the main prediction if this fails
}

// Continue with your existing response
res.json({ recommendedCrop: mlPrediction.recommendedCrop, ... });
```

#### Option B: Call the API Endpoint

Alternatively, make an HTTP call to the save endpoint:

```javascript
import fetch from 'node-fetch';

// After ML prediction
const mlPrediction = await predictCrop(...);

// 🆕 Save prediction
fetch('http://localhost:5001/api/crops/savePrediction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    farmerId: req.user?.id || 'farmer123',
    predictedCrop: mlPrediction.recommendedCrop,
    area: req.body.area || 2.5,
    region: 'Tumkur',
    season: 'Rabi 2025'
  })
}).catch(err => console.error('Failed to save prediction:', err));

// Continue normally
res.json({ recommendedCrop: mlPrediction.recommendedCrop, ... });
```

---

### Step 3: Dynamic Season Calculation (Optional)

Instead of hardcoding "Rabi 2025", calculate it dynamically:

```javascript
function getCurrentSeason() {
  const month = new Date().getMonth(); // 0-11
  const year = new Date().getFullYear();
  
  let season = '';
  if (month >= 6 && month <= 10) {
    season = 'kharif';  // June-Oct
  } else if (month >= 10 || month <= 3) {
    season = 'rabi';    // Nov-Mar
  } else {
    season = 'zaid';    // Apr-May
  }
  
  return `${season.charAt(0).toUpperCase() + season.slice(1)} ${year}`;
}

// Usage
const season = getCurrentSeason();  // Returns "Rabi 2025" or "Kharif 2024" etc.
```

---

## 📋 API Documentation

### POST /api/crops/savePrediction

**Purpose:** Save a farmer's crop prediction to MongoDB

**Request Body:**
```json
{
  "farmerId": "farmer123",
  "predictedCrop": "Wheat",
  "area": 2.5,
  "region": "Tumkur",
  "season": "Rabi 2025"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Crop prediction saved successfully",
  "data": {
    "id": "675abc123...",
    "farmerId": "farmer123",
    "predictedCrop": "Wheat",
    "area": 2.5,
    "region": "Tumkur",
    "season": "Rabi 2025",
    "timestamp": "2024-12-06T10:30:00.000Z"
  }
}
```

---

### GET /api/crops/frequency

**Purpose:** Get frequency statistics for a crop in a region+season

**Query Parameters:**
- `region` (required) - e.g., "Tumkur"
- `season` (required) - e.g., "Rabi 2025"
- `crop` (required) - e.g., "Wheat"

**Example Request:**
```
GET /api/crops/frequency?region=Tumkur&season=Rabi 2025&crop=Wheat
```

**Response:**
```json
{
  "region": "Tumkur",
  "season": "Rabi 2025",
  "crop": "Wheat",
  "totalFarmers": 10,
  "farmersWithSameCrop": 7,
  "frequencyPercent": 70,
  "totalArea": 4.5,
  "cropArea": 3.2,
  "areaSharePercent": 71.11,
  "competitionLevel": "Very High Competition",
  "message": "⚠️ High demand crop — many farmers are planning to grow this. Risk of market oversupply — consider diversification."
}
```

---

## 🎨 Frontend Integration

### Using the Standalone HTML Dashboard

**File:** `crop_frequency_dashboard.html`

**How to Use:**
1. Open `crop_frequency_dashboard.html` in any browser
2. Save some crop predictions using the form
3. Query frequency for any crop
4. See the Crop Frequency Insight card with LIVE data

**Features:**
- ✅ No dummy values - all data from MongoDB
- ✅ Real-time frequency calculations
- ✅ Color-coded competition levels
- ✅ Works for Tumkur, Rabi 2025

---

### Integrating into Your Existing Dashboard

If you want to add this to your existing HTML/JS dashboard:

**1. Add the HTML Card Structure:**

```html
<div id="frequencyCard" class="frequency-card" style="display: none;">
    <div class="card-header">
        <div>
            <div class="card-title">Crop Frequency Insight</div>
            <div class="card-subtitle" id="cardSubtitle">Tumkur | Rabi 2025</div>
        </div>
        <div id="competitionBadge" class="competition-badge badge-low">
            Low Competition
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-box">
            <div class="stat-label">Farmers Growing</div>
            <div class="stat-value" id="farmersGrowing">0</div>
            <div class="stat-sublabel" id="outOfTotal">out of 0</div>
        </div>

        <div class="stat-box">
            <div class="stat-label">Frequency</div>
            <div class="stat-value" id="frequency">0%</div>
            <div class="stat-sublabel">of farmers</div>
        </div>

        <div class="stat-box">
            <div class="stat-label">Total Area</div>
            <div class="stat-value" id="totalArea">0</div>
            <div class="stat-sublabel">hectares</div>
        </div>

        <div class="stat-box">
            <div class="stat-label">Area Share</div>
            <div class="stat-value" id="areaShare">0%</div>
            <div class="stat-sublabel">of total</div>
        </div>
    </div>

    <div id="messageBox" class="message-box">
        <p id="messageText">Loading...</p>
    </div>
</div>
```

**2. Add the JavaScript Function:**

```javascript
async function loadCropFrequency(crop, region = 'Tumkur', season = 'Rabi 2025') {
    try {
        const response = await fetch(
            `http://localhost:5001/api/crops/frequency?region=${encodeURIComponent(region)}&season=${encodeURIComponent(season)}&crop=${encodeURIComponent(crop)}`
        );
        
        const data = await response.json();
        
        if (response.ok) {
            // Update card subtitle
            document.getElementById('cardSubtitle').textContent = `${data.region} | ${data.season}`;
            
            // Update badge
            const badge = document.getElementById('competitionBadge');
            badge.textContent = data.competitionLevel;
            badge.className = 'competition-badge';
            
            if (data.competitionLevel.includes('Very High') || data.competitionLevel.includes('High')) {
                badge.classList.add('badge-high');
            } else if (data.competitionLevel.includes('Medium')) {
                badge.classList.add('badge-medium');
            } else {
                badge.classList.add('badge-low');
            }
            
            // Update stats
            document.getElementById('farmersGrowing').textContent = data.farmersWithSameCrop;
            document.getElementById('outOfTotal').textContent = `out of ${data.totalFarmers}`;
            document.getElementById('frequency').textContent = `${data.frequencyPercent}%`;
            document.getElementById('totalArea').textContent = data.cropArea;
            document.getElementById('areaShare').textContent = `${data.areaSharePercent}%`;
            
            // Update message
            document.getElementById('messageText').textContent = data.message;
            
            // Show card
            document.getElementById('frequencyCard').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load frequency:', error);
    }
}

// Call after crop prediction is shown
// Example: After showing "Wheat" as predicted crop
loadCropFrequency('Wheat');
```

**3. Copy CSS from `crop_frequency_dashboard.html`**

Copy the styles for `.frequency-card`, `.stat-box`, `.competition-badge`, etc.

---

## 🧪 Testing

### Test 1: Save Predictions

**Using curl:**
```bash
curl -X POST http://localhost:5001/api/crops/savePrediction \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "farmer001",
    "predictedCrop": "Wheat",
    "area": 3.5,
    "region": "Tumkur",
    "season": "Rabi 2025"
  }'
```

**Using the HTML dashboard:**
1. Open `crop_frequency_dashboard.html`
2. Fill in the form
3. Click "Save Prediction to MongoDB"
4. Should see success message

---

### Test 2: Query Frequency

**Using curl:**
```bash
curl "http://localhost:5001/api/crops/frequency?region=Tumkur&season=Rabi%202025&crop=Wheat"
```

**Using the HTML dashboard:**
1. Select a crop to analyze
2. Click "Get Frequency Insight"
3. Should see the Crop Frequency Insight card

---

### Test 3: Multiple Farmers

**Create diversity:**
```bash
# Save 10 predictions with different crops
for i in {1..10}; do
  curl -X POST http://localhost:5001/api/crops/savePrediction \
    -H "Content-Type: application/json" \
    -d "{\"farmerId\":\"farmer00$i\",\"predictedCrop\":\"Wheat\",\"area\":2.5,\"region\":\"Tumkur\",\"season\":\"Rabi 2025\"}"
done

# Save 5 predictions for Rice
for i in {11..15}; do
  curl -X POST http://localhost:5001/api/crops/savePrediction \
    -H "Content-Type: application/json" \
    -d "{\"farmerId\":\"farmer0$i\",\"predictedCrop\":\"Rice\",\"area\":2.0,\"region\":\"Tumkur\",\"season\":\"Rabi 2025\"}"
done

# Now query frequency
curl "http://localhost:5001/api/crops/frequency?region=Tumkur&season=Rabi%202025&crop=Wheat"
# Should show: 10 out of 15 farmers (66.67%)
```

---

## 🔍 Verification

### Check Backend Logs

When you save a prediction:
```
🌾 [Save Crop Prediction]
Data: { farmerId: 'farmer123', predictedCrop: 'Wheat', area: 2.5, region: 'Tumkur', season: 'Rabi 2025' }
✅ Crop prediction saved successfully: 675abc123...
```

When you query frequency:
```
📊 [Crop Frequency Analysis]
Query: { region: 'Tumkur', season: 'Rabi 2025', crop: 'Wheat' }
✅ Frequency analysis completed: { crop: 'Wheat', farmers: 7, total: 10, frequency: '70%', competition: 'Very High Competition' }
```

---

### Check MongoDB

**Using MongoDB Compass:**
1. Connect to `mongodb://localhost:27017`
2. Database: `krishi-sakha` (or your database name)
3. Collection: `croppredictions`
4. Should see documents with farmerId, predictedCrop, area, region, season

**Using mongosh:**
```javascript
use krishi-sakha;
db.croppredictions.find({ region: "Tumkur", season: "Rabi 2025" }).pretty();
```

---

## 📊 Competition Level Thresholds

The system automatically determines competition level:

| Frequency % | Competition Level | Message |
|-------------|------------------|---------|
| ≥ 70% | Very High Competition | ⚠️ High demand crop — risk of oversupply |
| 30-69% | Medium Competition | 📊 Moderately popular — balanced supply |
| < 30% | Low Competition | ✅ Good market opportunity |

**Formula:**
```javascript
frequencyPercent = (farmersWithSameCrop / totalFarmers) * 100
areaSharePercent = (cropArea / totalArea) * 100
```

---

## 🚨 Important Notes

### 1. **No Breaking Changes**
- New model: `CropPrediction` (separate from existing models)
- New routes: `/api/crops/*` (separate from existing routes)
- No changes to existing prediction logic

### 2. **Error Handling**
If saving prediction fails, it won't break ML prediction:
```javascript
try {
  // Save prediction
  await CropPrediction.create(...);
} catch (error) {
  // Log but don't fail the main prediction
  console.error('Failed to save prediction:', error.message);
}
```

### 3. **Performance**
- Indexed queries (fast lookups)
- Aggregation done in-memory (small datasets)
- No impact on ML prediction speed

---

## 🎯 Summary

### What You Need to Do:

1. ✅ **Backend is ready** - Routes already registered in `index.js`

2. 🔧 **Add one function call** - In your ML prediction handler:
   ```javascript
   // After ML model gives prediction
   await CropPrediction.create({
     farmerId: req.user?.id || 'farmer123',
     predictedCrop: mlPrediction.recommendedCrop,
     area: req.body.area || 2.5,
     region: 'Tumkur',
     season: 'Rabi 2025'
   });
   ```

3. 🎨 **Use the dashboard** - Open `crop_frequency_dashboard.html` to test

4. ✅ **Done!** - All values come from MongoDB (no dummy data)

---

## 📞 Support

If you need help finding where to add the `savePrediction` call:
1. Look for your crop prediction route (likely `backend/routes/predict.js`)
2. Find the function that calls the ML model
3. Add the save call right after getting ML prediction
4. Test with the HTML dashboard

**Example location to search for:**
```javascript
// Look for something like this in your code:
router.post('/crop', authenticate, async (req, res) => {
  const prediction = await predictCrop(...);
  
  // 🆕 ADD SAVE CALL HERE
  
  res.json({ recommendedCrop: prediction.crop });
});
```

---

**Status:** ✅ Ready to integrate  
**No existing features disturbed:** ✅ Guaranteed  
**All values from MongoDB:** ✅ Guaranteed  

🌾 **Your Crop Frequency Insight feature is ready to use!**
