import mongoose from 'mongoose';

const weatherAlertSchema = new mongoose.Schema({
  location: {
    lat: Number,
    lng: Number,
    name: String
  },
  condition: {
    type: String,
    required: true
  },
  temperature: Number,
  rainfall: Number,
  windSpeed: Number,
  humidity: Number,
  forecast: [{
    date: Date,
    temp: Number,
    condition: String,
    rainfall: Number,
    humidity: Number
  }],
  alerts: [{
    severity: String,
    message: String
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('WeatherAlert', weatherAlertSchema);
