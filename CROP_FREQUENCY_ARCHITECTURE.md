# 🏗️ Crop Frequency Insight - System Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CROP FREQUENCY INSIGHT SYSTEM                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND                                    │
│                    (CropRecommendation.jsx)                                │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. FARMER INTERACTION                                                     │
│     ┌────────────────────────────────────────┐                            │
│     │  Farmer clicks "Get Recommendation"    │                            │
│     └───────────────────┬────────────────────┘                            │
│                         │                                                  │
│                         ▼                                                  │
│     ┌────────────────────────────────────────┐                            │
│     │  POST /api/predict/crop                │                            │
│     │  { temperature, humidity, pH, ... }    │                            │
│     └───────────────────┬────────────────────┘                            │
│                         │                                                  │
│  ────────────────────────────────────────────────────────────────────     │
│                                                                            │
│  2. PREDICTION RECEIVED                                                    │
│     ┌────────────────────────────────────────┐                            │
│     │  Response: { recommendedCrop: "Rice",  │                            │
│     │   profitabilityScore: 92.5, ... }      │                            │
│     └───────────────────┬────────────────────┘                            │
│                         │                                                  │
│                         ▼                                                  │
│     ┌────────────────────────────────────────┐                            │
│     │  🆕 Auto-trigger:                       │                            │
│     │  fetchCropFrequency("Rice")            │                            │
│     └───────────────────┬────────────────────┘                            │
│                         │                                                  │
│  ────────────────────────────────────────────────────────────────────     │
│                                                                            │
│  3. FREQUENCY DATA FETCH                                                   │
│     ┌────────────────────────────────────────┐                            │
│     │  GET /api/crop-plans/                  │                            │
│     │    crop-frequency/Rice?                │                            │
│     │    district=Dharwad&taluk=Hubli        │                            │
│     └───────────────────┬────────────────────┘                            │
│                         │                                                  │
│                         ▼                                                  │
│     ┌────────────────────────────────────────┐                            │
│     │  Response: { statistics: {             │                            │
│     │    totalFarmers: 45,                   │                            │
│     │    farmersWithSameCrop: 18,            │                            │
│     │    frequencyPercentage: 40.0           │                            │
│     │  }, insight: { riskLevel: "high",      │                            │
│     │    colorCode: "red", ... } }           │                            │
│     └───────────────────┬────────────────────┘                            │
│                         │                                                  │
│  ────────────────────────────────────────────────────────────────────     │
│                                                                            │
│  4. UI RENDERING                                                           │
│     ┌────────────────────────────────────────┐                            │
│     │  Crop Frequency Insight Panel          │                            │
│     │  ┌──────────────────────────────────┐  │                            │
│     │  │ 🔴 Very High Competition         │  │                            │
│     │  │ ⚠️ High demand crop — many       │  │                            │
│     │  │    farmers planning to grow this │  │                            │
│     │  └──────────────────────────────────┘  │                            │
│     │  ┌────┬────┬────┬────┐                 │                            │
│     │  │ 18 │40% │92.4│35% │ Statistics      │                            │
│     │  └────┴────┴────┴────┘                 │                            │
│     │  Top Crops: Rice, Wheat, Maize         │                            │
│     │  ████████░░ 40% Market Saturation      │                            │
│     └────────────────────────────────────────┘                            │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTP Requests
                                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                BACKEND                                     │
│                      (Express.js API Server)                               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ROUTE: /api/crop-plans/crop-frequency/:cropName                          │
│  FILE: backend/routes/cropPlans.js (Lines 227-381)                        │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ 1. RECEIVE REQUEST                                                 │   │
│  │    GET /crop-frequency/Rice?district=Dharwad                       │   │
│  │    Extract: cropName = "Rice", district = "Dharwad"                │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ 2. DETERMINE CURRENT SEASON                                        │   │
│  │    const month = new Date().getMonth();                            │   │
│  │    if (month >= 6 && month <= 10) → "kharif"                       │   │
│  │    else if (month >= 10 || month <= 3) → "rabi"                    │   │
│  │    else → "zaid"                                                   │   │
│  │    Result: currentSeason = "kharif", currentYear = 2024            │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ 3. QUERY ALL CROP PLANS IN REGION                                 │   │
│  │    const baseQuery = {                                             │   │
│  │      year: 2024,                                                   │   │
│  │      season: { $in: ['kharif', 'year-round'] },                    │   │
│  │      status: { $in: ['planned', 'sowing', 'growing'] },            │   │
│  │      'region.district': 'Dharwad'                                  │   │
│  │    };                                                              │   │
│  │    const allCropPlans = await CropPlan.find(baseQuery);            │   │
│  │    Result: 45 crop plans found                                     │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ 4. COUNT UNIQUE FARMERS                                            │   │
│  │    const totalFarmers = new Set(                                   │   │
│  │      allCropPlans.map(plan => plan.farmerId.toString())            │   │
│  │    ).size;                                                         │   │
│  │    Result: 45 unique farmers                                       │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ 5. QUERY FARMERS WITH SAME CROP                                    │   │
│  │    const sameCropQuery = {                                         │   │
│  │      ...baseQuery,                                                 │   │
│  │      selectedCrop: "Rice"                                          │   │
│  │    };                                                              │   │
│  │    const sameCropPlans = await CropPlan.find(sameCropQuery);       │   │
│  │    const farmersWithSameCrop = new Set(...).size;                  │   │
│  │    Result: 18 farmers growing Rice                                 │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ 6. CALCULATE PERCENTAGE                                            │   │
│  │    const frequencyPercentage =                                     │   │
│  │      (farmersWithSameCrop / totalFarmers) * 100;                   │   │
│  │    Result: (18 / 45) * 100 = 40.0%                                 │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ 7. DETERMINE RISK LEVEL                                            │   │
│  │    if (frequencyPercentage >= 40) {                                │   │
│  │      trendDescription = 'Very High Competition';                   │   │
│  │      riskLevel = 'high';                                           │   │
│  │      colorCode = 'red';                                            │   │
│  │      insight = '⚠️ High demand crop — many farmers planning...';   │   │
│  │      recommendation = 'Risk of market oversupply...';              │   │
│  │    }                                                               │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ 8. CALCULATE ADDITIONAL METRICS                                    │   │
│  │    - Total area for this crop (hectares)                           │   │
│  │    - Area percentage                                               │   │
│  │    - Top 5 competing crops in region                               │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ 9. BUILD RESPONSE & SEND                                           │   │
│  │    res.json({ cropName, region, statistics, insight, ... });       │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────┬──────────────────────────────────────┘
                                     │
                                     │ MongoDB Queries
                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              MONGODB DATABASE                              │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  COLLECTION: cropplans                                                     │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ Document 1:                                                        │   │
│  │ {                                                                  │   │
│  │   _id: "673abc...",                                                │   │
│  │   farmerId: "673def...",                                           │   │
│  │   fieldId: "673ghi...",                                            │   │
│  │   selectedCrop: "Rice",         ← Query matches this               │   │
│  │   areaHectares: 5.2,                                               │   │
│  │   season: "kharif",             ← Filter by current season         │   │
│  │   year: 2024,                   ← Filter by current year           │   │
│  │   region: {                                                        │   │
│  │     state: "Karnataka",                                            │   │
│  │     district: "Dharwad",        ← Filter by district               │   │
│  │     taluk: "Hubli"                                                 │   │
│  │   },                                                               │   │
│  │   status: "planned",            ← Filter by active status          │   │
│  │   createdAt: "2024-12-01"                                          │   │
│  │ }                                                                  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ Document 2:                                                        │   │
│  │ {                                                                  │   │
│  │   farmerId: "673jkl...",                                           │   │
│  │   selectedCrop: "Wheat",        ← Different crop                   │   │
│  │   season: "kharif",                                                │   │
│  │   year: 2024,                                                      │   │
│  │   region: { district: "Dharwad" },                                 │   │
│  │   status: "planned"                                                │   │
│  │ }                                                                  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ Document 3... Document 45 (total 45 crop plans)                    │   │
│  │ - 18 documents with selectedCrop: "Rice"                           │   │
│  │ - 12 documents with selectedCrop: "Wheat"                          │   │
│  │ - 8 documents with selectedCrop: "Maize"                           │   │
│  │ - 7 documents with other crops                                     │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  INDEXES (for fast queries):                                              │
│  - { 'region.district': 1, 'region.taluk': 1, year: 1, season: 1 }        │
│  - { selectedCrop: 1, year: 1, season: 1 }                                 │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Sequence

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Farmer  │    │ Frontend │    │ Backend  │    │ MongoDB  │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │ 1. Get Crop   │               │               │
     │ Recommendation│               │               │
     │──────────────>│               │               │
     │               │               │               │
     │               │ 2. POST       │               │
     │               │ /predict/crop │               │
     │               │──────────────>│               │
     │               │               │               │
     │               │               │ 3. Run ML     │
     │               │               │ Prediction    │
     │               │               │               │
     │               │ 4. Return     │               │
     │               │ "Rice" (92.5%)│               │
     │               │<──────────────│               │
     │               │               │               │
     │               │ 5. Auto-fetch │               │
     │               │ frequency for │               │
     │               │ "Rice"        │               │
     │               │               │               │
     │               │ 6. GET        │               │
     │               │ /crop-frequency│              │
     │               │ /Rice?district│               │
     │               │──────────────>│               │
     │               │               │               │
     │               │               │ 7. Query all  │
     │               │               │ crop plans    │
     │               │               │──────────────>│
     │               │               │               │
     │               │               │ 8. Return     │
     │               │               │ 45 documents  │
     │               │               │<──────────────│
     │               │               │               │
     │               │               │ 9. Count      │
     │               │               │ Rice farmers  │
     │               │               │ (18/45 = 40%) │
     │               │               │               │
     │               │ 10. Return    │               │
     │               │ frequency data│               │
     │               │<──────────────│               │
     │               │               │               │
     │               │ 11. Render UI │               │
     │               │ panel with    │               │
     │               │ 🔴 Red warning│               │
     │               │               │               │
     │ 12. See       │               │               │
     │ "40% farmers  │               │               │
     │ growing Rice" │               │               │
     │<──────────────│               │               │
     │               │               │               │
     │ 13. Make      │               │               │
     │ decision:     │               │               │
     │ Switch to     │               │               │
     │ Maize         │               │               │
     │──────────────>│               │               │
     │               │               │               │
```

---

## Component Interaction Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND COMPONENTS                          │
└─────────────────────────────────────────────────────────────────────┘

CropRecommendation.jsx
├── useState
│   ├── sensorData (existing)
│   ├── recommendation (existing)
│   ├── cropFrequency (🆕 NEW)
│   └── loadingFrequency (🆕 NEW)
│
├── useEffect → fetchSensorData() (existing)
│
├── getRecommendation() (MODIFIED)
│   ├── POST /predict/crop
│   └── if success → fetchCropFrequency() (🆕 NEW)
│
├── fetchCropFrequency(cropName) (🆕 NEW)
│   ├── Build URL with district/taluk
│   ├── GET /crop-plans/crop-frequency/:cropName
│   └── setCropFrequency(data)
│
└── JSX Rendering
    ├── Sensor Data Card (existing)
    ├── Recommendation Card (existing)
    │   └── Top Recommended Crop (existing)
    │
    ├── 🆕 Crop Frequency Insight Panel (NEW)
    │   ├── Risk Indicator Banner
    │   ├── Statistics Grid (4 boxes)
    │   ├── Top Competing Crops
    │   └── Visual Progress Bar
    │
    └── Alternative Crops Card (existing)

┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND ROUTES                               │
└─────────────────────────────────────────────────────────────────────┘

cropPlans.js
├── POST /crop-plans (existing)
│   └── Saves crop selection to database
│
├── GET /my-plans (existing)
│   └── Returns farmer's crop plans
│
├── GET /regional-distribution (existing)
│   └── Returns crop distribution by area
│
└── 🆕 GET /crop-frequency/:cropName (NEW)
    ├── Extract cropName, district, taluk
    ├── Determine current season/year
    ├── Query MongoDB for all active crop plans
    ├── Count total farmers
    ├── Count farmers with same crop
    ├── Calculate percentage
    ├── Determine risk level
    ├── Build insights and recommendations
    └── Return JSON response
```

---

## Risk Level Decision Tree

```
                         Frequency Percentage
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                ≥ 40%                     < 40%
                    │                         │
         ┌──────────┴──────────┐    ┌────────┴────────┐
         │                     │    │                 │
    Very High           High   │  25-39%         < 25%
    Competition      (40-44%)  │                     │
         │                     │                     │
    🔴 RED                🟠 ORANGE        ┌────────┴────────┐
         │                     │           │                 │
    "Risk of              "Moderate   15-24%           < 15%
    oversupply"           risk"           │                 │
                                    🟡 YELLOW         ┌─────┴─────┐
                                          │           │           │
                                    "Balanced     5-14%       < 5%
                                    supply"           │           │
                                                 🟢 GREEN    🟢 GREEN
                                                      │           │
                                                  "Good    "Excellent
                                                opportunity" opportunity"
```

---

## MongoDB Query Optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUERY EXECUTION PLAN                          │
└─────────────────────────────────────────────────────────────────┘

Step 1: Index Selection
┌────────────────────────────────────────────────────┐
│ MongoDB chooses index:                             │
│ { 'region.district': 1, 'region.taluk': 1,         │
│   year: 1, season: 1 }                             │
└────────────────────────────────────────────────────┘
                      │
                      ▼
Step 2: Index Scan (Fast O(log n))
┌────────────────────────────────────────────────────┐
│ Match conditions:                                  │
│ - region.district = "Dharwad"                      │
│ - year = 2024                                      │
│ - season in ["kharif", "year-round"]               │
│ Result: 45 documents                               │
└────────────────────────────────────────────────────┘
                      │
                      ▼
Step 3: In-Memory Filter
┌────────────────────────────────────────────────────┐
│ Filter by status:                                  │
│ - status in ["planned", "sowing", "growing"]       │
│ Result: 45 documents (all active)                  │
└────────────────────────────────────────────────────┘
                      │
                      ▼
Step 4: Application-Level Processing (Node.js)
┌────────────────────────────────────────────────────┐
│ Extract unique farmerIds using Set:                │
│ - O(n) complexity                                  │
│ - new Set([id1, id2, id1, id3]) → size = 3         │
│ Result: 45 unique farmers                          │
└────────────────────────────────────────────────────┘
                      │
                      ▼
Step 5: Second Query (Same Index)
┌────────────────────────────────────────────────────┐
│ Additional filter:                                 │
│ - selectedCrop = "Rice"                            │
│ Uses index: { selectedCrop: 1, year: 1, season: 1 }│
│ Result: 18 documents                               │
└────────────────────────────────────────────────────┘
                      │
                      ▼
Step 6: Calculate & Return
┌────────────────────────────────────────────────────┐
│ Percentage: (18 / 45) * 100 = 40.0%                │
│ Total execution time: ~50-100ms                    │
└────────────────────────────────────────────────────┘
```

---

## Feature Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│              EXISTING KRISHI SAKHA FEATURES                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Sensor           │     │ Crop             │     │ Crop         │
│ Monitoring       │────>│ Prediction       │────>│ Frequency    │
│ (ESP32)          │     │ (ML Model)       │     │ Insight      │
│                  │     │                  │     │ (🆕 NEW)     │
│ - Temperature    │     │ - Random Forest  │     │              │
│ - Humidity       │     │ - Profitability  │     │ - Statistics │
│ - Soil Moisture  │     │ - Market-Aware   │     │ - Risk Level │
│ - pH             │     │                  │     │ - Insights   │
└──────────────────┘     └──────────────────┘     └──────────────┘
                                │                         │
                                ▼                         │
                         ┌──────────────┐                │
                         │ Crop Locking │                │
                         │ Mechanism    │                │
                         └──────┬───────┘                │
                                │                         │
                                ▼                         │
                         ┌──────────────┐                │
                         │ Save to      │                │
                         │ CropPlan DB  │<───────────────┘
                         └──────┬───────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ Used by Other       │
                    │ Farmers' Frequency  │
                    │ Insights            │
                    └─────────────────────┘

✅ NO CHANGES to existing features
✅ NO INTERFERENCE with existing data flows
✅ ADDITIVE ONLY - new feature sits on top of existing system
```

---

This architecture ensures **zero breaking changes** while providing powerful market intelligence to farmers.
