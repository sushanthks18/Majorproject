# Krishi Sakha (ಕೃಷಿಸಖ) – Soil's Voice for the Farmer

A comprehensive agricultural IoT management system integrating ESP32 sensors, machine learning, satellite monitoring, smart irrigation, live mandi prices, agricultural news, and farmer-labour marketplace. Built for real-time, production-ready agricultural decision support.

## 🌟 Features

### 👨‍🌾 Farmer Interface
- **Real-time IoT Sensor Monitoring**: 
  - Live ESP32 sensor data (temperature, humidity, soil moisture, pH, rainfall)
  - 24-hour rolling average aggregation for ML predictions
  - Exponential weighted averages for accurate trend analysis
  - Auto-refresh dashboard with WebSocket updates
  - Historical data visualization with interactive charts
  
- **🛰️ Satellite Monitoring**: 
  - NDVI (Normalized Difference Vegetation Index) crop health analysis
  - Sentinel-2 satellite imagery integration via Sentinel Hub API
  - Smart sensor placement recommendations based on field zones
  - Interactive Leaflet maps with field boundaries and sensor locations
  - Zone-based health scoring (healthy/moderate/stressed areas)
  
- **🤖 ML-Powered Predictions**:
  - Market-aware crop recommendation (Random Forest - 90.40% accuracy)
  - Uses both real-time AND aggregated sensor data
  - Disease risk prediction with preventive measures
  - Yield prediction with revenue estimation
  - Profitability scoring for alternative crops
  - Supply status indicators (oversupply/opportunity/balanced)
  
- **💧 Smart Irrigation**:
  - Automated irrigation scheduling based on soil moisture
  - Soil moisture-based water application recommendations
  - Water usage optimization for sustainability
  - Schedule management with timing suggestions
  
- **🧪 Fertilizer Optimization**:
  - NPK (Nitrogen-Phosphorus-Potassium) recommendations
  - Soil and crop-specific fertilizer suggestions
  - Application timing and quantity guidance
  
- **🔍 Field Management**:
  - Register fields via survey number lookup
  - GPS-based field registration with coordinates
  - Manual field entry with address
  - Automatic soil type detection from coordinates
  - Crop locking mechanism for season planning
  - Field boundary visualization on interactive maps
  
- **👷 Labour Marketplace**:
  - Find nearby labour agents with distance-based search
  - Filter by service type (plowing, sowing, spraying, harvesting, etc.)
  - Search radius up to 100km with real-time distance calculation
  - View agent ratings, experience, and equipment availability
  - Request services with preferred date/time
  - Track request status (pending/accepted/completed/cancelled)
  - Contact details exchange upon acceptance
  - Get directions to agent location
  
- **📈 Live Mandi Prices**: 
  - Real-time AGMARKNET API integration (Government of India)
  - 11,251+ cached price records for Karnataka APMCs
  - 24-hour cache strategy for reliability
  - Graceful fallback when government API unavailable
  - Historical price trends and market analysis
  - Multi-crop price comparison
  
- **📰 Agricultural News**:
  - Bilingual news (English/Kannada - ಕನ್ನಡ)
  - Daily auto-updating content with date-based variations
  - Categories: Market updates, Weather, Crops, Government schemes, Alerts
  - External links to official sources (AGMARKNET, IMD, PM-KISAN)
  - Auto-refresh on language switch
  
- **🔔 Notifications**: 
  - Real-time alerts for service requests
  - Weather condition notifications
  - Crop health alerts from satellite analysis
  
- **📊 Analytics**: 
  - Historical sensor data visualization
  - Interactive charts with Recharts library
  - Time-series analysis of environmental conditions
  
- **🌐 Bilingual Support**:
  - Full English/Kannada (ಕನ್ನಡ) language switching
  - Translation for all UI elements
  - Language-aware news and content

### 👷 Labour Agent Interface
- **Profile Management**: Set services offered, hourly rate, experience, equipment
- **Service Requests**: View, accept, or reject incoming farmer requests
- **Active Jobs**: Manage ongoing work with farmer contact details
- **Earnings Tracking**: Monitor completed jobs and total earnings
- **Real-time Notifications**: Instant alerts for new service requests

## 🛠️ Tech Stack

### Backend
- **Node.js** + Express.js
- **MongoDB** (Mongoose ODM)
- **Socket.io** (real-time updates)
- **Python** (ML models, satellite processing)
- **JWT** authentication
- **Bcrypt** (password hashing)
- **Geolib** (distance calculations)
- **Scikit-learn** (Random Forest ML model)
- **Sentinel Hub API** (satellite imagery)
- **Rasterio** (geospatial data processing)
- **AGMARKNET API** (Government of India mandi prices)

### Frontend
- **React 18** + Vite
- **React Router v6**
- **Tailwind CSS**
- **Axios** (HTTP client)
- **Socket.io Client** (WebSocket)
- **React Hot Toast** (notifications)
- **Recharts** (data visualization)
- **Lucide React** (icons)
- **Leaflet** (interactive maps)
- **React-Leaflet** (map components)

### IoT Hardware
- **ESP32** microcontroller
- **DHT22** (temperature & humidity sensor)
- **Soil moisture sensor**
- **pH sensor**
- **Rain sensor**
- **WiFi connectivity** for real-time data transmission

## 🤖 Machine Learning Model

### Model Architecture
- **Algorithm**: Random Forest Classifier
- **Number of Trees**: 2,000
- **Maximum Depth**: Unlimited
- **Criterion**: Entropy
- **Class Weighting**: Balanced

### Dataset Information
| Parameter | Value |
|-----------|-------|
| Total Samples | 11,500 |
| Training Samples | 9,200 (80%) |
| Testing Samples | 2,300 (20%) |
| Number of Crops | 22 |
| Original Features | 5 |
| Engineered Features | 6 |
| Total Features | 11 |

### Features Used
**Original Sensor Inputs:**
1. Temperature (°C)
2. Humidity (%)
3. Soil Moisture (%)
4. pH (0-14)
5. Rainfall (mm)

**Engineered Features:**
1. temp_humidity – Temperature × Humidity interaction
2. temp_rainfall – Temperature × Rainfall interaction
3. moisture_ph – Soil Moisture × pH interaction
4. humidity_moisture – Humidity × Soil Moisture interaction
5. temp_range – Temperature squared
6. water_availability – Average of Soil Moisture and Rainfall

### Model Performance
| Metric | Value |
|--------|-------|
| Training Accuracy (OOB) | 89.83% |
| Testing Accuracy | 90.40% |
| Cross-validation | 89.90% (±0.36%) |

### Supported Crops (22)
Apple, Banana, Blackgram, Chickpea, Coconut, Coffee, Cotton, Grapes, Jute, Kidneybeans, Lentil, Maize, Mango, Mothbeans, Mungbean, Muskmelon, Orange, Papaya, Pigeonpeas, Pomegranate, Rice, Watermelon

### Top Feature Importance
1. Humidity-Moisture Interaction: 13.20%
2. Water Availability: 12.46%
3. Rainfall: 12.10%
4. Humidity: 11.77%
5. Temperature: 8.66%

### Data Sources
- **Crop Parameters**: Indian Council of Agricultural Research (ICAR)
- **Market Data**: AGMARKNET Portal (https://agmarknet.gov.in)
- **Government API**: data.gov.in Open Data Platform

## 📦 Installation

### Prerequisites
- **Node.js** 16.20.2 or higher
- **MongoDB** 5.0+ installed and running
- **Python** 3.8+ (for ML models)
- **npm** or yarn
- **ESP32** device (optional, for live sensor data)

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/smart-agriculture
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

5. **Install Python dependencies** (for ML models):
```bash
cd ml
pip install -r requirements.txt
cd ..
```

6. Start MongoDB:
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

7. Start the backend server:
```bash
npm run dev
```

Server will run on `http://localhost:5001`

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

### ESP32 Setup (Optional - for live sensor data)

1. Open `esp32_sensor_client/esp32_sensor_client.ino` in Arduino IDE
2. Install required libraries:
   - DHT sensor library
   - WiFi library (built-in)
3. Update WiFi credentials and server IP in the code:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_LOCAL_IP:5001/api/sensors/data";
```
4. Upload to ESP32
5. Open Serial Monitor (115200 baud) to verify connection

For detailed ESP32 setup, see `ESP32_SETUP_GUIDE.md`

## Usage

### Testing the Complete Flow

#### 1. Create Farmer Account
- Go to `http://localhost:5173/signup`
- Select "Farmer" role
- Fill in details and capture location
- Login with credentials

#### 2. Create Agent Account
- Open incognito/another browser
- Go to `http://localhost:5173/signup`
- Select "Labour Agent" role
- Complete profile with services offered

#### 3. Agent: Set Up Profile
- Login as agent
- Navigate to "My Profile"
- Select services (e.g., Spraying, Harvesting)
- Set hourly rate, experience, labor count
- Save profile

#### 4. Farmer: Find Labour
- Login as farmer
- Click "Find Labour" from dashboard
- Select service type and search radius
- View nearby agents with distance
- Click "Request Service" on desired agent
- Fill in service details and submit

#### 5. Agent: Accept Request
- Agent receives real-time notification
- Go to "Service Requests"
- View farmer details, service, and location
- Click "Accept" to confirm
- Click "Get Directions" for navigation

#### 6. View Contact Details
- Both farmer and agent can now see each other's contact info
- Direct call/email links available
- Mark job as completed when done

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

#### Sensors
- `GET /api/sensors/latest` - Latest sensor reading
- `GET /api/sensors/history?hours=24` - Historical data
- `POST /api/sensors/data` - Store sensor data (from ESP32)

#### Satellite
- `POST /api/satellite/fetch-data/:fieldId` - Fetch satellite imagery
- `POST /api/satellite/analyze-ndvi/:fieldId` - Analyze NDVI and health
- `GET /api/satellite/latest/:fieldId` - Get latest analysis
- `GET /api/satellite/history/:fieldId` - Get analysis history

#### Fields
- `GET /api/fields` - Get all farmer fields
- `POST /api/fields/register-by-survey` - Register field by survey number
- `POST /api/fields/register-by-gps` - Register field by GPS coordinates
- `POST /api/fields/register-manual` - Register field manually
- `POST /api/fields/detect-soil-type` - Detect soil type from coordinates
- `PUT /api/fields/:fieldId/lock-crop` - Lock crop for season

#### Crop Plans
- `POST /api/crop-plans` - Save crop plan
- `GET /api/crop-plans/:fieldId` - Get field's crop plans

#### Mandi Prices
- `GET /api/mandi/prices` - Get live AGMARKNET prices
- `POST /api/mandi/refresh` - Refresh prices from government API
- `GET /api/mandi/crops` - Get available crops

#### Agricultural News
- `GET /api/news/agricultural?language=en` - Get agricultural news (English)
- `GET /api/news/agricultural?language=kn` - Get agricultural news (Kannada)
- `GET /api/news/agricultural?category=market` - Filter by category

#### Irrigation
- `POST /api/irrigation/schedule/:fieldId` - Create irrigation schedule
- `GET /api/irrigation/schedule/:fieldId` - Get field schedules

#### Fertilizer
- `POST /api/fertilizer/recommend/:fieldId` - Get fertilizer recommendations

#### ML Predictions
- `POST /api/predict/crop` - Crop recommendation
- `POST /api/predict/disease` - Disease risk
- `POST /api/predict/yield` - Yield prediction

#### Labour Agents
- `GET /api/agents/nearby?lat=&lng=&radius=50` - Find nearby agents
- `GET /api/agents/:id` - Get agent details
- `POST /api/agents/register` - Register/update agent profile
- `GET /api/agents/my-profile` - Get logged-in agent profile

#### Requests
- `POST /api/requests/create` - Create labour request
- `GET /api/requests/farmer/:farmerId` - Get farmer's requests
- `GET /api/requests/agent/:agentId` - Get agent's requests
- `PUT /api/requests/:id/status` - Update request status
- `PUT /api/requests/:id/cancel` - Cancel request

### Sending Sensor Data from ESP32

```javascript
// ESP32 automatically sends data every 5 seconds to:
// POST http://YOUR_IP:5001/api/sensors/data
{
  "temperature": 28.5,
  "humidity": 65.3,
  "soilMoisture": 45.2,
  "pH": 6.8,
  "rainLevel": 0,
  "deviceId": "ESP32_SENSOR_001",
  "apiKey": "krishi-sakha-esp32",
  "source": "krishi-sakha"
}
```

### Testing Live Mandi Prices

```bash
# Get live prices for a crop
curl "http://localhost:5001/api/mandi/prices?crop=Cotton&location=Hubli"

# Refresh prices from AGMARKNET API
curl -X POST http://localhost:5001/api/mandi/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"crop": "Cotton", "location": "Hubli"}'
```

### Testing Agricultural News

```bash
# Get English news
curl "http://localhost:5001/api/news/agricultural?language=en"

# Get Kannada news
curl "http://localhost:5001/api/news/agricultural?language=kn"

# Get market news only
curl "http://localhost:5001/api/news/agricultural?category=market&language=en"
```

### Real-time Features

The system uses **Socket.io** for:
- ✅ Live ESP32 sensor data updates (auto-refresh dashboard)
- ✅ New service request notifications (agents)
- ✅ Request status updates (farmers)
- ✅ Real-time sensor broadcasting to all connected clients
- ✅ ESP32 connection status updates

## 📁 Project Structure

```
phase3first/
├── backend/
│   ├── models/              # MongoDB schemas
│   │   ├── User.js
│   │   ├── SensorData.js
│   │   ├── Field.js
│   │   ├── CropPlan.js
│   │   ├── SatelliteAnalysis.js
│   │   ├── IrrigationSchedule.js
│   │   ├── FertilizerRecommendation.js
│   │   ├── Agent.js
│   │   ├── Request.js
│   │   └── MandiPrice.js    # 🆕 AGMARKNET price cache
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   ├── sensors.js
│   │   ├── fields.js
│   │   ├── cropPlans.js
│   │   ├── satellite.js
│   │   ├── irrigation.js
│   │   ├── fertilizer.js
│   │   ├── predict.js
│   │   ├── agents.js
│   │   ├── requests.js
│   │   ├── mandi.js         # 🆕 Live mandi price API
│   │   └── news.js          # 🆕 Agricultural news API
│   ├── middleware/          # Auth middleware
│   ├── ml/                  # Machine Learning
│   │   ├── train_model_all_crops.py    # Random Forest training (90.40% accuracy)
│   │   ├── predict_crop.py
│   │   ├── market_aware_predictor.py   # Production predictor with feature engineering
│   │   ├── random_forest_model.pkl     # Trained model (2000 trees)
│   │   ├── label_encoder.pkl           # Crop label encoder
│   │   ├── model_metadata.json         # Model performance metrics
│   │   ├── Crop_recommendation.csv     # Training dataset (11,500 samples)
│   │   ├── confusion_matrix.csv        # Model evaluation matrix
│   │   └── graphs/                     # Training performance graphs
│   ├── satellite_service.py # Satellite data processing
│   ├── index.js            # Server entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── VoiceAssistant.jsx
│   │   │   └── Loading.jsx
│   │   ├── context/         # Auth context
│   │   │   └── AuthContext.jsx
│   │   ├── pages/           # Route pages
│   │   │   ├── farmer/      # Farmer dashboard pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── FieldRegistration.jsx
│   │   │   │   ├── FieldsList.jsx
│   │   │   │   ├── SatelliteMonitoring.jsx  # 🛰️ Fixed blank page issue
│   │   │   │   ├── SmartIrrigation.jsx
│   │   │   │   ├── FertilizerOptimization.jsx
│   │   │   │   ├── CropRecommendation.jsx
│   │   │   │   ├── Analytics.jsx
│   │   │   │   ├── MandiPrices.jsx      # 🆕 Live AGMARKNET prices
│   │   │   │   ├── News.jsx             # 🆕 Bilingual agricultural news
│   │   │   │   ├── FindLabour.jsx
│   │   │   │   └── Notifications.jsx
│   │   │   ├── agent/       # Agent dashboard pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── AgentProfile.jsx
│   │   │   │   └── ServiceRequests.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   ├── utils/           # Helper functions
│   │   │   ├── api.js
│   │   │   ├── socket.js
│   │   │   └── translations.js  # 🆕 Bilingual translations
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   └── package.json
│
├── esp32_sensor_client/     # ESP32 Arduino code
│   └── ESP32_SETUP.txt
│
└── README.md
```

## Deployment

### Backend (Render/Railway/Heroku)
1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy

### Frontend (Vercel/Netlify)
1. Push code to GitHub
2. Connect repository
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_URL=https://your-backend-url.com/api`
6. Deploy

## ✅ Key Features Implemented

### Core Functionality
✅ Dual user interfaces (Farmer + Labour Agent)  
✅ JWT authentication with role-based access  
✅ Protected routes with middleware  
✅ Mobile-responsive design (Tailwind CSS)  
✅ Toast notifications for user feedback  

### IoT & Real-time
✅ **ESP32 sensor integration** with live data transmission  
✅ Real-time sensor data monitoring via WebSocket  
✅ Auto-refresh dashboard with connection status  
✅ Sensor data persistence in MongoDB  
✅ Historical data visualization with charts  

### Satellite & Geospatial
✅ **Sentinel-2 satellite imagery** integration  
✅ NDVI analysis for crop health assessment  
✅ Smart sensor placement recommendations  
✅ Interactive Leaflet maps with field boundaries  
✅ Zone-based health scoring (healthy/moderate/stressed)  

### Machine Learning
✅ **Random Forest crop recommendation** model (90.40% accuracy)  
✅ **11,500 samples** dataset with 22 crop types  
✅ **Feature engineering**: 5 sensor inputs expanded to 11 features  
✅ **Cross-validation accuracy**: 89.90% (±0.36%)  
✅ Market-aware predictions using supply/demand analysis  
✅ Uses both **real-time** and **24-hour aggregated** sensor data  
✅ Profitability scoring for alternative crops  
✅ Disease risk prediction with preventive measures  
✅ Yield estimation with revenue calculation  

### Field Management
✅ Multiple field registration methods (survey/GPS/manual)  
✅ Soil type auto-detection from coordinates  
✅ Crop locking mechanism for season planning  
✅ Field boundary visualization on maps  

### Smart Agriculture
✅ **Automated irrigation scheduling** based on soil moisture  
✅ **Fertilizer optimization** with NPK recommendations  
✅ **Live mandi prices** via AGMARKNET API integration  
✅ **11,251+ cached price records** for Karnataka APMCs  
✅ **24-hour cache strategy** with graceful API fallback  
✅ **Bilingual agricultural news** (English/Kannada)  
✅ **Daily auto-updating news** with 12 curated articles  
✅ Weather alerts and notifications  

### Labour Marketplace
✅ Geolocation-based agent search  
✅ Distance calculation between farmer and agents  
✅ Service request system with status tracking  
✅ Contact details exchange upon acceptance  
✅ Real-time notifications (Socket.io)  

### Production-Ready Features
✅ **AGMARKNET Integration:** Real-time government API with graceful error handling  
✅ **Rate Limiting:** 5-second minimum interval between API calls  
✅ **Cache Strategy:** 24-hour fallback when government API unavailable  
✅ **Bilingual Support:** Complete English/Kannada translation system  
✅ **Dynamic News:** Date-based variations for fresh daily content  
✅ **Professional UI:** Clean tagline display with Sprout icon branding  
✅ **Real-time Updates:** WebSocket integration for instant notifications  

## 🔮 Future Enhancements

- [ ] Payment integration for completed jobs
- [ ] Rating system for agents and farmers
- [ ] Advanced ML models (Deep Learning for disease detection)
- [ ] Image upload for crop disease detection (CNN)
- [ ] Chat system between farmer and agent
- [ ] Multi-language expansion (Hindi, Tamil, Telugu)
- [ ] Mobile app (React Native)
- [ ] Drone imagery integration
- [ ] Blockchain for supply chain tracking
- [ ] AI-powered chatbot for farming queries
- [ ] Weather forecast API integration
- [ ] Crop insurance recommendations

## 📄 License

MIT License - feel free to use this project for educational purposes.

---

## 👨‍💻 Author

**Sushanth KS**  
GitHub: [@sushanthks18](https://github.com/sushanthks18)

---

## 🙏 Acknowledgments

- Sentinel Hub for satellite imagery API
- Scikit-learn for ML framework
- MongoDB for database
- React team for amazing frontend framework
- ESP32 community for IoT resources

---

## 📞 Support

For issues, questions, or feature requests:  
- Open an issue on [GitHub](https://github.com/sushanthks18/phase3second/issues)
- Contact: [GitHub Profile](https://github.com/sushanthks18)

---

**⭐ If you find this project helpful, please give it a star!**
