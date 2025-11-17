# Smart Agriculture System

A complete dual-interface agricultural management system with IoT sensor integration, ML predictions, and labour marketplace.

## Features

### Farmer Interface
- **Real-time Sensor Monitoring**: Live temperature, humidity, soil moisture, and pH readings
- **ML Predictions**:
  - Crop recommendation based on soil conditions
  - Disease risk prediction with preventive measures
  - Yield prediction with revenue estimation
- **Labour Marketplace**:
  - Find nearby labour agents with distance-based search
  - Filter by service type, radius, rating, and availability
  - Request services with preferred date/time
  - Track request status (pending/accepted/completed)
  - View agent contact details upon acceptance
- **Alerts & Notifications**: Automated alerts for extreme conditions
- **Analytics**: Historical sensor data visualization

### Labour Agent Interface
- **Profile Management**: Set services offered, hourly rate, experience, equipment
- **Service Requests**: View, accept, or reject incoming farmer requests
- **Active Jobs**: Manage ongoing work with farmer contact details
- **Earnings Tracking**: Monitor completed jobs and total earnings
- **Real-time Notifications**: Instant alerts for new service requests

## Tech Stack

### Backend
- Node.js + Express
- MongoDB (Mongoose ODM)
- Socket.io (real-time updates)
- JWT authentication
- Bcrypt (password hashing)
- Geolib (distance calculations)

### Frontend
- React 18 + Vite
- React Router v6
- Tailwind CSS
- Axios
- Socket.io Client
- React Hot Toast (notifications)
- Recharts (data visualization)
- Lucide React (icons)

## Installation

### Prerequisites
- Node.js 16+
- MongoDB installed and running
- npm or yarn

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
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart-agriculture
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

5. Start MongoDB:
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

6. Start the backend server:
```bash
npm run dev
```

Server will run on `http://localhost:5000`

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
- `POST /api/sensors/data` - Store sensor data

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

### Sending Sensor Data

```javascript
// Example: POST to /api/sensors/data
{
  "temperature": 28.5,
  "humidity": 65,
  "soilMoisture": 45,
  "pH": 6.8,
  "farmerId": "optional-farmer-id"
}
```

### Real-time Features

The system uses Socket.io for:
- Live sensor data updates (auto-refresh dashboard)
- New service request notifications (agents)
- Request status updates (farmers)

## Project Structure

```
smart-agriculture/
├── backend/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   ├── index.js         # Server entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── context/     # Auth context
│   │   ├── pages/       # Route pages
│   │   │   ├── farmer/  # Farmer dashboard pages
│   │   │   └── agent/   # Agent dashboard pages
│   │   ├── utils/       # Helper functions
│   │   ├── App.jsx      # Main app component
│   │   └── main.jsx     # Entry point
│   └── package.json
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

## Key Features Implemented

✅ Dual user interfaces (Farmer + Labour Agent)
✅ JWT authentication with role-based access
✅ Real-time sensor data monitoring
✅ ML-based crop/disease/yield predictions
✅ Geolocation-based agent search
✅ Distance calculation between farmer and agents
✅ Service request system with status tracking
✅ Real-time notifications (Socket.io)
✅ Contact details exchange upon acceptance
✅ Mobile-responsive design
✅ Toast notifications for user feedback
✅ Protected routes
✅ Auto-location capture

## Future Enhancements

- Payment integration for completed jobs
- Rating system for agents
- Advanced ML models (Python integration)
- Weather API integration
- Chat system between farmer and agent
- Image upload for crop disease detection
- Multi-language support
- Mobile app (React Native)

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
