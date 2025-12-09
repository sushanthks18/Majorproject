# Krishi Sakha – IoT Based Farm Assistant

A comprehensive agricultural management system with ESP32 IoT sensor integration, ML-powered crop predictions, satellite monitoring, smart irrigation, and farmer-agent marketplace.

## 🌟 Features

### 👨‍🌾 Farmer Interface
- **Real-time IoT Sensor Monitoring**: Live ESP32 sensor data (temperature, humidity, soil moisture, pH, rainfall)
- **🛰️ Satellite Monitoring**: 
  - NDVI analysis for crop health assessment
  - Sentinel-2 satellite imagery integration
  - Smart sensor placement recommendations based on field zones
  - Interactive map with field boundaries and sensor locations
- **🤖 ML-Powered Predictions**:
  - Market-aware crop recommendation (Random Forest model)
  - Crop frequency insight with competition analysis
  - Disease risk prediction with preventive measures
  - Yield prediction with revenue estimation
- **💧 Smart Irrigation**:
  - Automated irrigation scheduling
  - Soil moisture-based recommendations
  - Water usage optimization
- **🧪 Fertilizer Optimization**:
  - NPK recommendations based on soil and crop
  - Application timing suggestions
- **📊 Crop Frequency Insight**:
  - Real-time market competition analysis
  - Region and season-based crop frequency
  - Risk level assessment (Very High/High/Medium/Low)
  - Smart thresholds (requires ≥5 farmers for meaningful competition)
- **🔍 Field Management**:
  - Register fields via survey number, GPS, or manual coordinates
  - Soil type detection
  - Crop locking mechanism for season planning
- **👷 Labour Marketplace**:
  - Find nearby labour agents with distance-based search
  - Filter by service type, radius, rating, and availability
  - Request services with preferred date/time
  - Track request status (pending/accepted/completed)
- **📈 Mandi Prices**: Live market prices for crops
- **🔔 Notifications**: Automated alerts for weather and crop conditions
- **📊 Analytics**: Historical sensor data visualization with charts
- **🎤 Voice Assistant**: Voice-controlled farm assistant

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
- `GET /api/crop-plans/crop-frequency/:cropName` - Get crop frequency insight

#### Crop Frequency (New Feature)
- `POST /api/crops/savePrediction` - Save crop prediction
- `GET /api/crops/frequency?region=X&season=Y&crop=Z` - Get frequency analysis
- `GET /api/crops/all` - Get all predictions

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

### Testing Crop Frequency Insight

```bash
# Save a crop prediction
curl -X POST http://localhost:5001/api/crops/savePrediction \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "farmer123",
    "predictedCrop": "Wheat",
    "area": 3.5,
    "region": "Tumkur",
    "season": "Rabi 2025"
  }'

# Get frequency analysis
curl "http://localhost:5001/api/crops/frequency?region=Tumkur&season=Rabi%202025&crop=Wheat"
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
│   │   ├── CropPrediction.js  # 🆕 New for frequency insight
│   │   ├── SatelliteAnalysis.js
│   │   ├── IrrigationSchedule.js
│   │   ├── FertilizerRecommendation.js
│   │   ├── Agent.js
│   │   └── Request.js
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   ├── sensors.js
│   │   ├── fields.js
│   │   ├── cropPlans.js
│   │   ├── crops.js         # 🆕 New crop frequency routes
│   │   ├── satellite.js
│   │   ├── irrigation.js
│   │   ├── predict.js
│   │   ├── agents.js
│   │   └── requests.js
│   ├── middleware/          # Auth middleware
│   ├── ml/                  # Machine Learning
│   │   ├── train_model.py
│   │   ├── predict_crop.py
│   │   ├── market_aware_predictor.py
│   │   └── graphs/          # Training performance graphs
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
│   │   │   │   ├── MandiPrices.jsx
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
│   │   │   └── helpers.js
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
✅ **Random Forest crop recommendation** model  
✅ Market-aware predictions (91.71% accuracy)  
✅ **Crop frequency insight** with competition analysis  
✅ Smart risk thresholds (requires ≥5 farmers)  
✅ Disease risk prediction  
✅ Yield estimation with revenue calculation  

### Field Management
✅ Multiple field registration methods (survey/GPS/manual)  
✅ Soil type auto-detection from coordinates  
✅ Crop locking mechanism for season planning  
✅ Field boundary visualization on maps  

### Smart Agriculture
✅ **Automated irrigation scheduling** based on soil moisture  
✅ **Fertilizer optimization** with NPK recommendations  
✅ **Live mandi prices** for market intelligence  
✅ Weather alerts and notifications  

### Labour Marketplace
✅ Geolocation-based agent search  
✅ Distance calculation between farmer and agents  
✅ Service request system with status tracking  
✅ Contact details exchange upon acceptance  
✅ Real-time notifications (Socket.io)  

### Recent Fixes
✅ **Fixed:** Satellite Monitoring blank page (missing Navbar import)  
✅ **Improved:** Crop frequency logic (no high risk for single farmer)  
✅ **Removed:** Sensor update toast notifications (user request)  

## 🔮 Future Enhancements

- [ ] Payment integration for completed jobs
- [ ] Rating system for agents and farmers
- [ ] Advanced ML models (Deep Learning for disease detection)
- [ ] Image upload for crop disease detection (CNN)
- [ ] Chat system between farmer and agent
- [ ] Multi-language support (Kannada, Hindi, Tamil)
- [ ] Mobile app (React Native)
- [ ] Drone imagery integration
- [ ] Blockchain for supply chain tracking
- [ ] AI-powered chatbot for farming queries

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
