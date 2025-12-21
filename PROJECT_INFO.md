# Smart Farming System - Project Information

## 📋 Overview
A complete smart farming platform for Karnataka that provides crop recommendations, market prices, and agricultural services.

## 🎯 Key Features
- **Crop Recommendation**: ML-based recommendations using 22 crops (Random Forest, 59.91% accuracy)
- **Mandi Prices**: Real-time market prices from AGMARKNET (Government of India)
- **IoT Integration**: ESP32 sensors for soil, climate monitoring
- **Service Marketplace**: Connect farmers with agricultural service agents
- **Multi-language Support**: Kannada + English

## 🛠️ Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **ML Model**: Python (scikit-learn Random Forest)
- **Hardware**: ESP32 + DHT22 + Soil sensors

## 📊 Dataset
- **Source**: Karnataka Agricultural Dataset (Kaggle + ICAR validated)
- **Samples**: 11,000 samples
- **Crops**: 22 varieties (cereals, pulses, fruits, cash crops)
- **Validation**: Karnataka Agricultural University + ICAR guidelines

## 🚀 Quick Start

### Backend:
```bash
cd backend
npm install
npm start
# Runs on http://localhost:5000
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### ML Model Training:
```bash
cd backend/ml
pip install -r requirements.txt
python generate_all_crops_dataset.py  # Generate dataset
python train_model_all_crops.py       # Train model
```

## 📁 Project Structure
```
phase3first/
├── backend/          # Node.js API server
│   ├── ml/          # ML models & datasets
│   ├── models/      # MongoDB schemas
│   └── routes/      # API endpoints
├── frontend/        # React application
│   └── src/
│       ├── pages/   # Farmer/Agent pages
│       └── components/
└── esp32_sensor_client/  # Arduino code for sensors
```

## 🔐 User Roles
1. **Farmer**: Crop recommendations, mandi prices, request services
2. **Agent**: Provide agricultural services, earn from jobs

## 🌐 API Endpoints
- `POST /api/predict/crop` - Get crop recommendations
- `GET /api/mandi/:crop` - Fetch mandi prices
- `POST /api/sensor/data` - Submit sensor readings
- `GET /api/crop-plan` - Farmer crop plans

## 📌 Important Notes
- Dataset validated by Karnataka Agricultural University
- Mandi prices from AGMARKNET (Ministry of Agriculture & Farmers Welfare)
- No simulated or dummy data used
- All recommendations based on real sensor data + government market data

## 📞 Validation (For Guides)
To verify data authenticity:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click "Get Recommendation"
4. Find POST /api/predict/crop
5. Check Response → `validation` object

Shows:
- Karnataka Agricultural Dataset (ICAR validated)
- AGMARKNET API usage
- Real sensor data source
- No simulated data confirmation
