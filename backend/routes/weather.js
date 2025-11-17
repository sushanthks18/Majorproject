import express from 'express';
import { authenticate } from '../middleware/auth.js';
import WeatherAlert from '../models/WeatherAlert.js';
import { createNotification } from '../utils/notificationService.js';

const router = express.Router();

// Mock weather data generator (replace with real API like OpenWeatherMap)
const generateWeatherData = (lat, lng) => {
  const baseTemp = 25 + Math.random() * 15;
  const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Thunderstorm'];
  
  return {
    location: { lat, lng, name: 'Your Location' },
    condition: conditions[Math.floor(Math.random() * conditions.length)],
    temperature: Math.round(baseTemp),
    rainfall: Math.random() > 0.7 ? Math.round(Math.random() * 50) : 0,
    windSpeed: Math.round(10 + Math.random() * 30),
    humidity: Math.round(50 + Math.random() * 40),
    forecast: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      temp: Math.round(baseTemp + (Math.random() - 0.5) * 10),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      rainfall: Math.random() > 0.6 ? Math.round(Math.random() * 40) : 0,
      humidity: Math.round(50 + Math.random() * 40)
    })),
    updatedAt: new Date()
  };
};

// Get current weather
router.get('/current', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }
    
    const weather = generateWeatherData(parseFloat(lat), parseFloat(lng));
    
    // Save to database
    await WeatherAlert.create(weather);
    
    res.json(weather);
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get weather forecast
router.get('/forecast', authenticate, async (req, res) => {
  try {
    const { lat, lng, days = 7 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }
    
    const weather = generateWeatherData(parseFloat(lat), parseFloat(lng));
    const forecast = weather.forecast.slice(0, parseInt(days));
    
    res.json({
      location: weather.location,
      forecast,
      summary: {
        rainyDays: forecast.filter(d => d.rainfall > 0).length,
        avgTemp: Math.round(forecast.reduce((a, b) => a + b.temp, 0) / forecast.length),
        maxRainfall: Math.max(...forecast.map(d => d.rainfall))
      }
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get weather alerts
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    const weather = generateWeatherData(parseFloat(lat), parseFloat(lng));
    const alerts = [];
    
    // Generate alerts based on weather
    if (weather.temperature > 38) {
      alerts.push({
        severity: 'warning',
        message: 'Heat wave alert! Temperature above 38°C. Increase irrigation frequency.'
      });
    }
    
    if (weather.forecast[0].rainfall > 50) {
      alerts.push({
        severity: 'alert',
        message: `Heavy rain expected (${weather.forecast[0].rainfall}mm). Delay spraying/fertilizer application.`
      });
      
      // Create notification
      await createNotification(
        req.userId,
        'warning',
        'weather',
        'Heavy Rain Alert',
        `Heavy rain expected tomorrow (${weather.forecast[0].rainfall}mm). Delay spraying/fertilizer application.`,
        'view_details'
      );
    }
    
    const rainyDays = weather.forecast.filter(d => d.rainfall > 0).length;
    if (rainyDays === 0) {
      alerts.push({
        severity: 'info',
        message: 'No rain forecasted for 7 days. Plan irrigation schedule.'
      });
    }
    
    if (weather.windSpeed > 40) {
      alerts.push({
        severity: 'warning',
        message: `Strong winds ${weather.windSpeed}km/h expected. Secure equipment and provide support to crops.`
      });
    }
    
    res.json({
      alerts,
      current: {
        temperature: weather.temperature,
        condition: weather.condition,
        rainfall: weather.rainfall
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get farming advice based on weather
router.get('/farming-advice', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    const weather = generateWeatherData(parseFloat(lat), parseFloat(lng));
    const advice = [];
    
    // Temperature-based advice
    if (weather.temperature > 35) {
      advice.push({
        category: 'irrigation',
        priority: 'high',
        message: 'High temperature detected. Irrigate during early morning or late evening to reduce water loss.'
      });
    }
    
    // Rainfall-based advice
    if (weather.forecast[0].rainfall > 20) {
      advice.push({
        category: 'operations',
        priority: 'medium',
        message: 'Rain expected tomorrow. Postpone pesticide/fertilizer application for 2-3 days.'
      });
    } else if (weather.forecast.filter(d => d.rainfall > 0).length === 0) {
      advice.push({
        category: 'irrigation',
        priority: 'high',
        message: 'No rain expected for a week. Ensure adequate irrigation schedule.'
      });
    }
    
    // Humidity-based advice
    if (weather.humidity > 80) {
      advice.push({
        category: 'disease',
        priority: 'high',
        message: 'High humidity increases disease risk. Monitor crops closely and consider preventive spraying.'
      });
    }
    
    res.json({
      weather: {
        temperature: weather.temperature,
        humidity: weather.humidity,
        condition: weather.condition
      },
      advice
    });
  } catch (error) {
    console.error('Error fetching farming advice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
