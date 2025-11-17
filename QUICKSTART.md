# 🚀 Quick Start Guide

Follow these steps to get the Smart Agriculture System running:

## Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Step 2: Start MongoDB

```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB

# Or use MongoDB Atlas (cloud) and update MONGODB_URI in backend/.env
```

## Step 3: Seed Test Data

```bash
cd backend
npm run seed
```

This creates test accounts:

**Farmers:**
- Email: `farmer1@test.com` | Password: `password123`
- Email: `farmer2@test.com` | Password: `password123`

**Labour Agents:**
- Email: `agent1@test.com` | Password: `password123`
- Email: `agent2@test.com` | Password: `password123`
- Email: `agent3@test.com` | Password: `password123`

## Step 4: Start Backend Server

```bash
# From backend folder
npm run dev
```

Backend runs on: `http://localhost:5000`

## Step 5: Start Frontend

```bash
# Open new terminal
cd frontend
npm run dev
```

Frontend runs on: `http://localhost:5173`

## Step 6: Test the Complete Flow

### Test as Farmer:
1. Go to `http://localhost:5173/login`
2. Login with `farmer1@test.com` / `password123`
3. View dashboard with live sensor data
4. Click "Find Labour"
5. See nearby agents (3 agents available)
6. Click "Request Service" on any agent
7. Fill in service details and submit
8. Go to "My Requests" to track status

### Test as Agent (Open in Incognito/Another Browser):
1. Login with `agent1@test.com` / `password123`
2. Go to "My Profile" and review/edit services
3. Go to "Service Requests"
4. You'll see the request from farmer1
5. Click "Accept" to accept the request
6. View farmer contact details
7. Click "Get Directions" to open Google Maps

### Test Real-time Updates:
- Keep both farmer and agent dashboards open
- When agent accepts request, farmer receives instant notification
- Contact details appear automatically

## Step 7: Send Sensor Data (Optional)

Use Postman or curl to simulate IoT sensor:

```bash
curl -X POST http://localhost:5000/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 32,
    "humidity": 75,
    "soilMoisture": 45,
    "pH": 6.5
  }'
```

The farmer dashboard will update in real-time!

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check `MONGODB_URI` in `backend/.env`

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.js`

### CORS Errors
- Ensure both servers are running
- Check proxy settings in `frontend/vite.config.js`

### Real-time Updates Not Working
- Check Socket.io connection in browser console
- Ensure both frontend and backend are running

## Next Steps

1. **Create your own accounts** with real locations
2. **Explore ML predictions**:
   - Crop Recommendation
   - Disease Risk Check
   - Yield Prediction
3. **Test geolocation** by enabling GPS in browser
4. **Customize services** in agent profile
5. **View analytics** in farmer dashboard

## Production Deployment

See `README.md` for detailed deployment instructions to:
- Backend: Render, Railway, or Heroku
- Frontend: Vercel or Netlify
- Database: MongoDB Atlas (free tier available)

---

**Need Help?** Check the main README.md or open an issue on GitHub.
