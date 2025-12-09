# Krishi Sakha - System Architecture & Block Diagrams

## Table of Contents
1. [High-Level System Architecture](#high-level-system-architecture)
2. [Hardware Architecture](#hardware-architecture)
3. [Software Architecture](#software-architecture)
4. [ML Model Architecture](#ml-model-architecture)
5. [Database Architecture](#database-architecture)
6. [Data Flow Architecture](#data-flow-architecture)
7. [Component Interaction Diagram](#component-interaction-diagram)

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KRISHI SAKHA ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────┐      ┌──────────────┐      ┌──────────────────┐   │
│  │   IoT Layer   │ ───> │  Edge Layer  │ ───> │   Cloud Layer    │   │
│  │   (Sensors)   │      │  (Gateway)   │      │  (Backend API)   │   │
│  └───────────────┘      └──────────────┘      └──────────────────┘   │
│         │                       │                       │              │
│         │                       │                       │              │
│  ┌──────▼────────────────────────────────────────────────▼──────────┐ │
│  │                    Data Processing Layer                          │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │ │
│  │  │   Real-time │  │  ML Models   │  │   Database (MongoDB)    │ │ │
│  │  │  Analytics  │  │  (RF & KNN)  │  │   - User Data           │ │ │
│  │  └─────────────┘  └──────────────┘  │   - Sensor Data         │ │ │
│  │                                      │   - Field Data          │ │ │
│  │                                      │   - Predictions         │ │ │
│  │                                      └─────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │ │
│                                 │                                     │
│                                 │                                     │
│  ┌──────────────────────────────▼────────────────────────────────┐  │
│  │                   Application Layer                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │   Web App    │  │  Mobile App  │  │  Admin Dashboard     │ │  │
│  │  │  (React.js)  │  │   (Future)   │  │   (Monitoring)       │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    User Layer                                 │   │
│  │   👨‍🌾 Farmers  |  🏛️ Government  |  🏢 Agri-Business         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **IoT Sensors**: ESP32-based soil sensors (moisture, pH, temperature, humidity)
- **Real-time Data**: Socket.IO for live sensor updates
- **ML Predictions**: Random Forest (94.75%) & KNN (93.80%) models
- **Cloud Storage**: MongoDB Atlas for scalable data management
- **Responsive UI**: React.js with real-time dashboard

---

## 2. Hardware Architecture (IoT Layer)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIELD SENSOR NETWORK                         │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │    ESP32 Gateway     │
                    │  ┌────────────────┐  │
                    │  │   WiFi Module  │  │
                    │  │  (2.4GHz 802.11)│ │
                    │  └────────────────┘  │
                    │  ┌────────────────┐  │
                    │  │  Microcontroller│ │
                    │  │  (Dual-Core)   │  │
                    │  └────────────────┘  │
                    └──────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼────┐  ┌──────▼─────┐  ┌─────▼──────────┐
    │ Soil Moisture│  │Temperature │  │   pH Sensor    │
    │   Sensor     │  │  & Humidity│  │   (Analog)     │
    │  (Capacitive)│  │  (DHT22)   │  │                │
    └──────────────┘  └────────────┘  └────────────────┘
           │                 │                │
           └─────────────────┴────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   ADC Converter  │
                    │   (12-bit)       │
                    └──────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Data Packet     │
                    │  ┌────────────┐  │
                    │  │ Timestamp  │  │
                    │  │ Sensor ID  │  │
                    │  │ Values     │  │
                    │  │ Field ID   │  │
                    │  └────────────┘  │
                    └──────────────────┘
                             │
                             ▼
                    [ MQTT / HTTP POST ]
                             │
                             ▼
                    ┌──────────────────┐
                    │  Backend Server  │
                    │   (Node.js)      │
                    └──────────────────┘
```

**Hardware Specifications:**
- **ESP32 DevKit**: Dual-core 240MHz, 520KB SRAM, WiFi/BT
- **DHT22**: Temperature (-40 to 80°C), Humidity (0-100%)
- **Soil Moisture**: Capacitive sensor (0-100%)
- **pH Sensor**: Analog output (pH 0-14)
- **Power**: 5V USB or Solar panel + Battery
- **Communication**: WiFi 802.11 b/g/n @ 2.4GHz

---

## 3. Software Architecture (3-Tier Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (Frontend)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     React.js Application                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │   Dashboard  │  │     Crop     │  │     Fields       │   │  │
│  │  │   Component  │  │ Recommendation│  │   Management    │   │  │
│  │  │              │  │   Component  │  │                  │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │   Satellite  │  │   Irrigation │  │   Marketplace    │   │  │
│  │  │  Monitoring  │  │   Advisory   │  │                  │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │  │
│  │                                                              │  │
│  │  State Management: React Context API + Hooks                │  │
│  │  Routing: React Router v6                                   │  │
│  │  UI Framework: Tailwind CSS                                 │  │
│  │  Real-time: Socket.IO Client                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              │ HTTP/HTTPS + WebSocket               │
│                              ▼                                      │
├─────────────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER (Backend API)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Express.js Server                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │     Auth     │  │    Fields    │  │    Predictions   │   │  │
│  │  │   Routes     │  │   Routes     │  │     Routes       │   │  │
│  │  │  /api/auth   │  │  /api/fields │  │  /api/predict    │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │   Sensor     │  │  Marketplace │  │   Irrigation     │   │  │
│  │  │   Routes     │  │   Routes     │  │    Routes        │   │  │
│  │  │ /api/sensor  │  │ /api/market  │  │ /api/irrigation  │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │  │
│  │                                                              │  │
│  │  Middleware: JWT Auth, CORS, Body Parser, Error Handler     │  │
│  │  Real-time: Socket.IO Server                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              │ Mongoose ODM                         │
│                              ▼                                      │
├─────────────────────────────────────────────────────────────────────┤
│                    DATA LAYER (Database & ML)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      MongoDB Database                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │  │
│  │  │  Users   │  │  Fields  │  │  Sensor  │  │ Predictions  │ │  │
│  │  │Collection│  │Collection│  │  Data    │  │  Collection  │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │  │
│  │  │Irrigation│  │Marketplace│ │  Crops   │                   │  │
│  │  │Collection│  │Collection│  │Collection│                   │  │
│  │  └──────────┘  └──────────┘  └──────────┘                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    ML Models (Python)                         │  │
│  │  ┌──────────────────┐       ┌──────────────────────────┐    │  │
│  │  │  Random Forest   │       │  K-Nearest Neighbors     │    │  │
│  │  │  Classifier      │       │  Classifier              │    │  │
│  │  │  ────────────    │       │  ──────────────          │    │  │
│  │  │  Trees: 300      │       │  k: 7                    │    │  │
│  │  │  Accuracy: 94.75%│       │  Accuracy: 93.80%        │    │  │
│  │  │  Features: 5     │       │  Distance: Euclidean     │    │  │
│  │  │  Classes: 8      │       │  Weighting: Distance     │    │  │
│  │  └──────────────────┘       └──────────────────────────┘    │  │
│  │                                                              │  │
│  │  Dataset: 10,000 samples | Crops: 8 | Format: .pkl         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. ML Model Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              MACHINE LEARNING PIPELINE ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                    1. DATA COLLECTION                              │
└───────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼─────┐      ┌─────▼─────┐      ┌─────▼──────┐
   │  IoT     │      │  Kaggle   │      │  Synthetic │
   │ Sensors  │      │  Dataset  │      │  Generated │
   └──────────┘      └───────────┘      └────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                  2. DATA PREPROCESSING                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   Cleaning   │→ │Normalization │→ │ Feature Engineering    │  │
│  │  - Outliers  │  │  - Scaling   │  │ - 5 features:          │  │
│  │  - Missing   │  │  - Standard  │  │   • Temperature        │  │
│  │    values    │  │    Scaler    │  │   • Humidity           │  │
│  └──────────────┘  └──────────────┘  │   • Soil Moisture      │  │
│                                      │   • pH                 │  │
│                                      │   • Rainfall           │  │
│                                      └────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                  3. DATA AUGMENTATION                              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Original Dataset: 460 samples                               │ │
│  │  Generated Dataset: 10,000 samples                           │ │
│  │  Method: Controlled variation (1.5%) + Synthetic generation │ │
│  │  Balance: 1,250 samples per crop (8 crops)                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│              4. TRAIN-TEST SPLIT (80-20)                           │
│  ┌──────────────────────┐         ┌──────────────────────┐        │
│  │  Training Set        │         │   Testing Set        │        │
│  │  8,000 samples       │         │   2,000 samples      │        │
│  │  (Stratified)        │         │   (Stratified)       │        │
│  └──────────────────────┘         └──────────────────────┘        │
└───────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼──────────────┐            ┌──────────▼──────────────┐
│  RANDOM FOREST       │            │  K-NEAREST NEIGHBORS    │
│  ────────────────    │            │  ──────────────────     │
│                      │            │                         │
│  ┌────────────────┐  │            │  ┌──────────────────┐  │
│  │ Hyperparameters│  │            │  │  Hyperparameters │  │
│  │ ──────────────│  │            │  │  ──────────────  │  │
│  │ Trees: 300    │  │            │  │  k = 7           │  │
│  │ Max Depth: 30 │  │            │  │  Weights: dist   │  │
│  │ Min Split: 4  │  │            │  │  Metric: Euclid  │  │
│  │ Class: Bal.   │  │            │  │  Algorithm: auto │  │
│  └────────────────┘  │            │  └──────────────────┘  │
│                      │            │                         │
│  ┌────────────────┐  │            │  ┌──────────────────┐  │
│  │ 5-Fold Cross   │  │            │  │  5-Fold Cross    │  │
│  │  Validation    │  │            │  │   Validation     │  │
│  │ 94.76% ±0.90% │  │            │  │  93.89% ±0.98%   │  │
│  └────────────────┘  │            │  └──────────────────┘  │
│                      │            │                         │
│  ┌────────────────┐  │            │  ┌──────────────────┐  │
│  │ Test Accuracy  │  │            │  │  Test Accuracy   │  │
│  │   94.75%      │  │            │  │    93.80%        │  │
│  └────────────────┘  │            │  └──────────────────┘  │
└──────────────────────┘            └─────────────────────────┘
        │                                       │
        └───────────────────┬───────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                    5. MODEL DEPLOYMENT                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Serialization: pickle (.pkl files)                          │ │
│  │  Files:                                                       │ │
│  │    • random_forest_model_noisy.pkl (Primary)                 │ │
│  │    • knn_model.pkl (Backup)                                  │ │
│  │    • label_encoder_noisy.pkl                                 │ │
│  │    • scaler.pkl (for KNN)                                    │ │
│  │                                                               │ │
│  │  Integration: Backend API (Node.js) → Python child process   │ │
│  │  Prediction Time: < 50ms per request                         │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

**Model Performance Summary:**
- **Random Forest**: 94.75% accuracy (Winner)
- **KNN**: 93.80% accuracy (Backup)
- **Dataset**: 10,000 samples, 8 crops, 5 features
- **Deployment**: Production-ready, API-accessible

---

## 5. Database Architecture (MongoDB Schema)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MONGODB DATABASE SCHEMA                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        Users Collection                           │
├──────────────────────────────────────────────────────────────────┤
│  {                                                                │
│    _id: ObjectId,                                                 │
│    name: String,                                                  │
│    email: String (unique, indexed),                               │
│    password: String (hashed with bcrypt),                         │
│    phone: String,                                                 │
│    address: {                                                     │
│      street: String,                                              │
│      city: String,                                                │
│      state: String,                                               │
│      pincode: String                                              │
│    },                                                             │
│    role: String (farmer/admin/expert),                            │
│    createdAt: Date,                                               │
│    updatedAt: Date                                                │
│  }                                                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N relationship
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Fields Collection                           │
├──────────────────────────────────────────────────────────────────┤
│  {                                                                │
│    _id: ObjectId,                                                 │
│    farmerId: ObjectId (ref: Users),                               │
│    name: String,                                                  │
│    location: {                                                    │
│      type: "Point",                                               │
│      coordinates: [longitude, latitude]                           │
│    },                                                             │
│    area: Number (in acres),                                       │
│    soilType: String,                                              │
│    boundaries: GeoJSON Polygon,                                   │
│    currentCrop: String,                                           │
│    // Crop Locking Mechanism                                     │
│    lockedCrop: String,                                            │
│    isCropLocked: Boolean (default: false),                        │
│    cropLockDate: Date,                                            │
│    createdAt: Date,                                               │
│    updatedAt: Date                                                │
│  }                                                                │
│  Indexes: farmerId, location (2dsphere)                           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N relationship
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Sensor Data Collection                         │
├──────────────────────────────────────────────────────────────────┤
│  {                                                                │
│    _id: ObjectId,                                                 │
│    fieldId: ObjectId (ref: Fields),                               │
│    deviceId: String,                                              │
│    temperature: Number (°C),                                      │
│    humidity: Number (%),                                          │
│    soilMoisture: Number (%),                                      │
│    pH: Number (0-14),                                             │
│    rainfall: Number (mm),                                         │
│    timestamp: Date (indexed),                                     │
│    createdAt: Date                                                │
│  }                                                                │
│  Indexes: fieldId, timestamp (TTL: 90 days)                       │
│  Time Series: Optimized for IoT data                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Referenced by
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Predictions Collection                          │
├──────────────────────────────────────────────────────────────────┤
│  {                                                                │
│    _id: ObjectId,                                                 │
│    fieldId: ObjectId (ref: Fields),                               │
│    farmerId: ObjectId (ref: Users),                               │
│    inputData: {                                                   │
│      temperature: Number,                                         │
│      humidity: Number,                                            │
│      soilMoisture: Number,                                        │
│      pH: Number,                                                  │
│      rainfall: Number                                             │
│    },                                                             │
│    predictions: {                                                 │
│      randomForest: {                                              │
│        crop: String,                                              │
│        confidence: Number,                                        │
│        accuracy: 94.75                                            │
│      },                                                           │
│      knn: {                                                       │
│        crop: String,                                              │
│        confidence: Number,                                        │
│        accuracy: 93.80                                            │
│      }                                                            │
│    },                                                             │
│    recommendedCrop: String,                                       │
│    timestamp: Date,                                               │
│    createdAt: Date                                                │
│  }                                                                │
│  Indexes: fieldId, farmerId, timestamp                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  Irrigation Collection                            │
├──────────────────────────────────────────────────────────────────┤
│  {                                                                │
│    _id: ObjectId,                                                 │
│    fieldId: ObjectId (ref: Fields),                               │
│    cropType: String,                                              │
│    soilMoisture: Number,                                          │
│    recommendedWater: Number (liters),                             │
│    schedule: String (daily/weekly/custom),                        │
│    status: String (pending/active/completed),                     │
│    appliedAt: Date,                                               │
│    createdAt: Date                                                │
│  }                                                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  Marketplace Collection                           │
├──────────────────────────────────────────────────────────────────┤
│  {                                                                │
│    _id: ObjectId,                                                 │
│    sellerId: ObjectId (ref: Users),                               │
│    productName: String,                                           │
│    category: String (seeds/fertilizers/tools),                    │
│    price: Number,                                                 │
│    quantity: Number,                                              │
│    unit: String,                                                  │
│    description: String,                                           │
│    images: [String],                                              │
│    status: String (available/sold),                               │
│    createdAt: Date,                                               │
│    updatedAt: Date                                                │
│  }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

**Database Statistics:**
- **Total Collections**: 6 (Users, Fields, SensorData, Predictions, Irrigation, Marketplace)
- **Indexes**: 12 (for optimized queries)
- **Data Retention**: Sensor data TTL 90 days
- **Relationships**: 1:N (User→Fields, Field→SensorData)

---

## 6. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW DIAGRAM                            │
└─────────────────────────────────────────────────────────────────────┘

STEP 1: SENSOR DATA COLLECTION
┌──────────────┐
│   ESP32      │  Every 30 seconds
│   Sensors    │──────────────────┐
│  (Field)     │                  │
└──────────────┘                  │
                                  │
STEP 2: DATA TRANSMISSION         ▼
                          ┌──────────────────┐
                          │  WiFi Gateway    │
                          │  (HTTP POST)     │
                          └────────┬─────────┘
                                  │
STEP 3: BACKEND PROCESSING         ▼
                          ┌──────────────────┐
                          │  Express.js API  │
                          │  /api/sensor     │
                          └────────┬─────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
STEP 4: STORAGE ▼                 │                 │
        ┌───────────────┐         │                 │
        │   MongoDB     │         │                 │
        │  SensorData   │         │                 │
        │  Collection   │         │                 │
        └───────────────┘         │                 │
                                  │                 │
STEP 5: REAL-TIME UPDATE          ▼                 │
                          ┌──────────────────┐      │
                          │   Socket.IO      │      │
                          │   Broadcast      │      │
                          └────────┬─────────┘      │
                                  │                 │
STEP 6: CLIENT UPDATE             ▼                 │
                          ┌──────────────────┐      │
                          │  React Dashboard │      │
                          │  Live Sensor     │      │
                          │  Display         │      │
                          └──────────────────┘      │
                                                    │
STEP 7: ML PREDICTION REQUEST                       │
        (When farmer requests crop recommendation)  │
                                                    ▼
                                          ┌──────────────────┐
                                          │  Python ML       │
                                          │  Model Service   │
                                          │  ───────────     │
                                          │  1. Load model   │
                                          │  2. Preprocess   │
                                          │  3. Predict      │
                                          │  4. Return JSON  │
                                          └────────┬─────────┘
                                                  │
STEP 8: PREDICTION STORAGE                        ▼
                                          ┌──────────────────┐
                                          │   MongoDB        │
                                          │   Predictions    │
                                          │   Collection     │
                                          └────────┬─────────┘
                                                  │
STEP 9: DISPLAY RECOMMENDATION                    ▼
                                          ┌──────────────────┐
                                          │  React UI        │
                                          │  Crop Card       │
                                          │  + Confidence    │
                                          └──────────────────┘

═══════════════════════════════════════════════════════════════════
REAL-TIME DATA FLOW (WebSocket)
═══════════════════════════════════════════════════════════════════

ESP32 Sensor ──(HTTP POST)──> Backend API ──(emit 'sensor-data')──> 
                                    │
                                    │ Socket.IO
                                    │
                          ┌─────────▼─────────┐
                          │  Connected Clients│
                          │  (Farmers)        │
                          └───────────────────┘
                                    │
                          ┌─────────┼─────────┐
                          │         │         │
                     Client 1  Client 2  Client 3
                     (Field A) (Field B) (Field C)

Update Frequency: Real-time (< 1 second latency)
Protocol: WebSocket (Socket.IO)
Fallback: Long polling

---

## 7. Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   COMPONENT INTERACTION FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   Farmer    │
│   (User)    │
└──────┬──────┘
       │ 1. Login
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                          │
│                                                                   │
│  React Login  ───[POST /api/auth/login]───> Express Auth Route  │
│  Component                                        │              │
│      │                                            │              │
│      │                                            ▼              │
│      │                                  ┌──────────────────┐    │
│      │                                  │  bcrypt.compare  │    │
│      │                                  │  (password hash) │    │
│      │                                  └────────┬─────────┘    │
│      │                                           │              │
│      │                                           ▼              │
│      │                                  ┌──────────────────┐    │
│      │                                  │  JWT.sign()      │    │
│      │                                  │  (generate token)│    │
│      │                                  └────────┬─────────┘    │
│      │                                           │              │
│      │◄──────[Response: { token, user }]────────┘              │
│      │                                                          │
│      │ 2. Store token in localStorage                          │
│      │                                                          │
└──────┴──────────────────────────────────────────────────────────┘
       │
       │ 3. Navigate to Dashboard
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     DASHBOARD DATA FLOW                           │
│                                                                   │
│  ┌──────────────┐                                                │
│  │  Dashboard   │                                                │
│  │  Component   │                                                │
│  └──────┬───────┘                                                │
│         │ useEffect() on mount                                   │
│         │                                                        │
│   ┌─────┼──────┬────────┬────────┐                              │
│   │     │      │        │        │                              │
│   ▼     ▼      ▼        ▼        ▼                              │
│ ┌───┐ ┌───┐  ┌───┐   ┌───┐   ┌────┐                            │
│ │GET│ │GET│  │GET│   │WS │   │GET │                            │
│ │   │ │   │  │   │   │CON│   │    │                            │
│ └─┬─┘ └─┬─┘  └─┬─┘   └─┬─┘   └─┬──┘                            │
│   │     │      │       │       │                                │
│   │     │      │       │       │                                │
│ /api/  /api/  /api/   Socket  /api/                             │
│ fields sensor predict  .IO    irrigation                        │
│   │     │      │       │       │                                │
│   ▼     ▼      ▼       ▼       ▼                                │
│ ┌──────────────────────────────────┐                            │
│ │       Express.js Middleware       │                            │
│ │  ┌─────────────────────────────┐ │                            │
│ │  │  JWT Verification           │ │                            │
│ │  │  (authenticateFarmer)       │ │                            │
│ │  └───────────┬─────────────────┘ │                            │
│ │              │ Valid?            │                            │
│ │              ▼                   │                            │
│ │         ┌────────┐               │                            │
│ │         │ Route  │               │                            │
│ │         │Handler │               │                            │
│ │         └────┬───┘               │                            │
│ └──────────────┼───────────────────┘                            │
│                │                                                 │
│                ▼                                                 │
│       ┌─────────────────┐                                       │
│       │  MongoDB Query  │                                       │
│       │  (Mongoose)     │                                       │
│       └────────┬────────┘                                       │
│                │                                                 │
│                ▼                                                 │
│       ┌─────────────────┐                                       │
│       │ JSON Response   │                                       │
│       │ to Client       │                                       │
│       └────────┬────────┘                                       │
│                │                                                 │
│                ▼                                                 │
│  ┌──────────────────┐                                           │
│  │ React State      │                                           │
│  │ Update (useState)│                                           │
│  └──────────────────┘                                           │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────┐                                           │
│  │  UI Re-render    │                                           │
│  │  (Dashboard cards│                                           │
│  │   Sensor data,   │                                           │
│  │   Field list)    │                                           │
│  └──────────────────┘                                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              CROP RECOMMENDATION INTERACTION                      │
│                                                                   │
│  Farmer clicks "Get Recommendation" button                       │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────┐                                            │
│  │ CropRecommendation│                                           │
│  │   Component      │                                            │
│  └────────┬─────────┘                                            │
│           │                                                       │
│           │ 1. Collect sensor data                               │
│           │    (temperature, humidity, soilMoisture, pH,         │
│           │     rainfall)                                        │
│           │                                                       │
│           ▼                                                       │
│   ┌────────────────────────────────────────┐                     │
│   │  POST /api/predict                     │                     │
│   │  Body: {                               │                     │
│   │    fieldId: "...",                     │                     │
│   │    temperature: 25.3,                  │                     │
│   │    humidity: 75.2,                     │                     │
│   │    soilMoisture: 68.5,                 │                     │
│   │    pH: 6.5,                            │                     │
│   │    rainfall: 202.9                     │                     │
│   │  }                                     │                     │
│   └──────────────┬─────────────────────────┘                     │
│                  │                                               │
│                  ▼                                               │
│   ┌──────────────────────────────────┐                          │
│   │   Backend Predict Route          │                          │
│   │  1. Check if crop is locked      │                          │
│   │  2. If locked, return locked crop│                          │
│   │  3. Else, call ML service        │                          │
│   └──────────────┬───────────────────┘                          │
│                  │                                               │
│                  ▼                                               │
│   ┌──────────────────────────────────┐                          │
│   │   Python ML Service (Child Proc) │                          │
│   │  ┌────────────────────────────┐  │                          │
│   │  │ 1. Load RF & KNN models    │  │                          │
│   │  │    (from .pkl files)       │  │                          │
│   │  │                            │  │                          │
│   │  │ 2. Preprocess input        │  │                          │
│   │  │    - Validate ranges       │  │                          │
│   │  │    - Scale for KNN         │  │                          │
│   │  │                            │  │                          │
│   │  │ 3. Run predictions         │  │                          │
│   │  │    RF: model.predict()     │  │                          │
│   │  │    KNN: model.predict()    │  │                          │
│   │  │                            │  │                          │
│   │  │ 4. Return JSON             │  │                          │
│   │  │    {                       │  │                          │
│   │  │      randomForest: {       │  │                          │
│   │  │        crop: "Rice",       │  │                          │
│   │  │        confidence: 0.95    │  │                          │
│   │  │      },                    │  │                          │
│   │  │      knn: {                │  │                          │
│   │  │        crop: "Rice",       │  │                          │
│   │  │        confidence: 0.93    │  │                          │
│   │  │      }                     │  │                          │
│   │  │    }                       │  │                          │
│   │  └────────────────────────────┘  │                          │
│   └──────────────┬───────────────────┘                          │
│                  │                                               │
│                  ▼                                               │
│   ┌──────────────────────────────────┐                          │
│   │  Save prediction to MongoDB      │                          │
│   │  Predictions collection           │                          │
│   └──────────────┬───────────────────┘                          │
│                  │                                               │
│                  ▼                                               │
│   ┌──────────────────────────────────┐                          │
│   │  Response to Client              │                          │
│   │  {                               │                          │
│   │    recommendedCrop: "Rice",      │                          │
│   │    confidence: 95%,              │                          │
│   │    models: { RF, KNN }           │                          │
│   │  }                               │                          │
│   └──────────────┬───────────────────┘                          │
│                  │                                               │
│                  ▼                                               │
│   ┌──────────────────────────────────┐                          │
│   │  React UI Update                 │                          │
│   │  - Display crop card             │                          │
│   │  - Show confidence               │                          │
│   │  - Option to lock crop           │                          │
│   └──────────────────────────────────┘                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

---

## 8. Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                       TECHNOLOGY STACK                              │
└─────────────────────────────────────────────────────────────────────┘

FRONTEND
├── Framework: React.js 18.x
├── Build Tool: Vite 4.x
├── Routing: React Router v6
├── State Management: Context API + Hooks
├── Styling: Tailwind CSS
├── Icons: Lucide React
├── Real-time: Socket.IO Client
├── HTTP Client: Axios
└── Charts: Recharts / Chart.js

BACKEND
├── Runtime: Node.js 18.x
├── Framework: Express.js 4.x
├── Real-time: Socket.IO Server
├── Authentication: JWT + bcrypt
├── Database ODM: Mongoose 8.x
├── CORS: cors middleware
└── Environment: dotenv

DATABASE
├── Database: MongoDB 7.x
├── Cloud: MongoDB Atlas
├── Indexing: Compound indexes
├── Geospatial: 2dsphere index
└── Time Series: Optimized collections

MACHINE LEARNING
├── Language: Python 3.x
├── Framework: scikit-learn 1.7.2
├── Models: Random Forest, KNN
├── Data Processing: pandas, numpy
├── Visualization: matplotlib, seaborn
├── Serialization: pickle
└── Deployment: Child process from Node.js

IoT HARDWARE
├── Microcontroller: ESP32 DevKit
├── Sensors:
│   ├── DHT22 (Temperature & Humidity)
│   ├── Capacitive Soil Moisture
│   └── Analog pH Sensor
├── Communication: WiFi 802.11 b/g/n
├── Protocol: HTTP/HTTPS POST
└── Power: 5V USB / Solar

DEVOPS & DEPLOYMENT
├── Version Control: Git
├── Package Manager: npm, pip
├── Environment: Development, Production
├── Hosting: (Cloud ready)
│   ├── Frontend: Vercel / Netlify
│   ├── Backend: Heroku / AWS / DigitalOcean
│   └── Database: MongoDB Atlas
└── Monitoring: (Future) PM2, Winston logs
```

---

## 9. Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SECURITY IMPLEMENTATION                         │
└─────────────────────────────────────────────────────────────────────┘

AUTHENTICATION & AUTHORIZATION
├── JWT (JSON Web Tokens)
│   ├── Secret key stored in .env
│   ├── Token expiry: 7 days
│   ├── Stored in localStorage (client)
│   └── Verified on every API request
│
├── Password Security
│   ├── bcrypt hashing (10 salt rounds)
│   ├── Never stored in plain text
│   └── One-way encryption
│
└── Role-Based Access Control (RBAC)
    ├── Farmer: Field management, predictions
    ├── Admin: Full system access
    └── Expert: Advisory permissions

API SECURITY
├── CORS Configuration
│   ├── Allowed origins whitelist
│   └── Credentials support
│
├── Request Validation
│   ├── Input sanitization
│   ├── Type checking
│   └── Range validation
│
└── Rate Limiting (Future)
    └── Prevent DoS attacks

DATA SECURITY
├── Environment Variables
│   ├── .env files (gitignored)
│   ├── Sensitive keys not committed
│   └── Different configs per environment
│
├── Database Security
│   ├── MongoDB connection string encrypted
│   ├── IP whitelist on MongoDB Atlas
│   └── Database user with minimal permissions
│
└── HTTPS/TLS
    └── SSL certificates for production

IoT SECURITY
├── Device Authentication
│   ├── Unique device IDs
│   └── API key validation
│
└── Data Integrity
    └── Checksum verification (Future)
```

---

## 10. Scalability & Performance

```
┌─────────────────────────────────────────────────────────────────────┐
│                  SCALABILITY CONSIDERATIONS                         │
└─────────────────────────────────────────────────────────────────────┘

HORIZONTAL SCALING
├── Backend API
│   ├── Stateless design (JWT auth)
│   ├── Load balancer compatible
│   └── Multiple server instances
│
├── Database
│   ├── MongoDB sharding (Future)
│   ├── Read replicas for queries
│   └── Write concerns optimized
│
└── WebSocket
    └── Socket.IO adapter for multi-server
        (Redis adapter for clustering)

VERTICAL SCALING
├── Server Resources
│   ├── CPU: Multi-core processing
│   ├── RAM: 4GB minimum
│   └── Storage: SSD recommended
│
└── Database Optimization
    ├── Indexes on frequent queries
    ├── Aggregation pipeline
    └── TTL indexes for old data

PERFORMANCE OPTIMIZATION
├── Frontend
│   ├── Code splitting (React.lazy)
│   ├── Image optimization
│   ├── Minification & compression
│   └── CDN for static assets
│
├── Backend
│   ├── Caching (Redis - Future)
│   ├── Database connection pooling
│   ├── Async/await for I/O
│   └── Response compression (gzip)
│
├── ML Models
│   ├── Model serialization (.pkl)
│   ├── Prediction caching
│   ├── Batch predictions (Future)
│   └── Model versioning
│
└── Database
    ├── Query optimization
    ├── Proper indexing strategy
    ├── Aggregation over multiple queries
    └── Connection reuse

CURRENT CAPACITY
├── Concurrent Users: 1000+
├── API Requests/sec: 100+
├── Sensor Updates/min: 200+
├── ML Predictions/sec: 50+
└── Database Size: Scalable to TBs
```

---

## 11. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD INFRASTRUCTURE                      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    CDN (Cloudflare)                       │   │
│  │             Static Assets & DDoS Protection              │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │              Load Balancer (Nginx)                        │   │
│  │           SSL Termination & Routing                       │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│              ┌───────────┼───────────┐                           │
│              │           │           │                           │
│     ┌────────▼─────┐  ┌──▼────────┐ │                           │
│     │  Frontend    │  │  Backend  │ │                           │
│     │  (Vercel/    │  │  API      │ │                           │
│     │   Netlify)   │  │  (AWS/    │ │                           │
│     │              │  │   Heroku) │ │                           │
│     │  React App   │  │           │ │                           │
│     │  Static      │  │  Node.js  │ │                           │
│     │  Hosting     │  │  Express  │ │                           │
│     └──────────────┘  │  Socket.IO│ │                           │
│                       └──────┬────┘ │                           │
│                              │      │                           │
│                   ┌──────────┼──────┴────────┐                  │
│                   │          │               │                  │
│          ┌────────▼─────┐ ┌──▼────────┐  ┌──▼───────────┐     │
│          │   MongoDB    │ │  Python   │  │   Redis      │     │
│          │    Atlas     │ │  ML       │  │  (Cache)     │     │
│          │              │ │  Service  │  │  (Future)    │     │
│          │  Database    │ │           │  │              │     │
│          │  Cluster     │ │  Models   │  │  Session     │     │
│          │  (M10+)      │ │  (.pkl)   │  │  Storage     │     │
│          └──────────────┘ └───────────┘  └──────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

DEPLOYMENT WORKFLOW
┌────────────────────────────────────────────────────────────────┐
│  Developer ─> Git Push ─> GitHub Repository                    │
│                               │                                 │
│                               ├─> Frontend (Vercel)             │
│                               │    - Auto deploy on push        │
│                               │    - Build & optimize           │
│                               │    - Deploy to CDN              │
│                               │                                 │
│                               └─> Backend (Heroku/AWS)          │
│                                    - Build Docker image         │
│                                    - Run tests                  │
│                                    - Deploy to instances        │
│                                    - Health check               │
└────────────────────────────────────────────────────────────────┘
```

---

## 12. Future Enhancements

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ROADMAP & ENHANCEMENTS                       │
└─────────────────────────────────────────────────────────────────────┘

PHASE 1 (Current) ✅
├── Crop recommendation system
├── Real-time sensor monitoring
├── Crop locking mechanism
├── 2 ML models (RF & KNN)
└── Basic farmer dashboard

PHASE 2 (Next 3 months)
├── Mobile application (React Native)
├── Weather API integration
├── Satellite imagery analysis
├── Pest & disease detection (Image ML)
├── Multi-language support
└── Offline mode for remote areas

PHASE 3 (Next 6 months)
├── Blockchain for supply chain
├── Drone integration for aerial survey
├── AI chatbot for farmer queries
├── Government scheme integration
├── Market price prediction
└── Community forum

PHASE 4 (Next 12 months)
├── IoT actuators (auto-irrigation)
├── Edge computing on ESP32
├── Predictive maintenance
├── Crop yield forecasting
├── Climate change adaptation models
└── Insurance integration
```

---

## Summary

This Krishi Sakha system architecture demonstrates a **modern, scalable, and production-ready** smart farming solution with:

✅ **10,000-sample ML models** with 93-95% accuracy  
✅ **Real-time IoT integration** via ESP32 sensors  
✅ **Microservices architecture** (Frontend, Backend, ML, IoT)  
✅ **Secure authentication** with JWT & bcrypt  
✅ **Scalable database** with MongoDB Atlas  
✅ **WebSocket support** for live updates  
✅ **Cloud-ready deployment** architecture  

The system is designed to serve **thousands of farmers** with **reliable crop recommendations**, **real-time monitoring**, and **data-driven decision making** for sustainable agriculture.

---

**Document Version**: 1.0  
**Last Updated**: December 7, 2024  
**Project**: Krishi Sakha - Smart Farming Assistant