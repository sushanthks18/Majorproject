import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Card, { StatCard } from '../../components/Card';
import VoiceAssistant from '../../components/VoiceAssistant';
import { Thermometer, Droplets, Sprout, FlaskConical, Search, Activity, TrendingUp, Bell, BarChart3, ShoppingBag, CloudRain, Wind, Eye } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';
import Loading from '../../components/Loading';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [stats, setStats] = useState({
    activeRequests: 0,
    completedJobs: 0,
    alerts: 0
  });

  useEffect(() => {
    fetchSensorData();
    fetchStats();
    fetchWeather();
    fetchTopNotifications();
    setupRealtimeUpdates();
  }, []);

  const fetchSensorData = async () => {
    try {
      const response = await api.get('/sensors/latest');
      const data = response.data.data;
      setSensorData(data);
      
      // Check if this is recent ESP32 data
      if (data) {
        const now = new Date();
        const dataTime = new Date(data.timestamp || data.createdAt);
        const timeDiff = (now - dataTime) / 1000;
        
        // If data is less than 30 seconds old, mark as connected
        if (timeDiff < 30) {
          const isRealESP32 = data.deviceId?.includes('ESP32') || data.source === 'krishi-sakha';
          if (isRealESP32) {
            setEsp32Connected(true);
            setLastUpdateTime(dataTime);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async () => {
    try {
      let lat = user?.location?.lat || 12.9716;
      let lng = user?.location?.lng || 77.5946;
      
      // Fallback to Bangalore coordinates if invalid
      if (!lat || !lng || lat === 0 || lng === 0) {
        lat = 12.9716;
        lng = 77.5946;
      }
      
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`,
        { signal: AbortSignal.timeout(5000) } // 5 second timeout
      );
      
      if (weatherResponse.ok) {
        const weatherData = await weatherResponse.json();
        
        // Transform to our format
        setWeather({
          temperature: Math.round(weatherData.current.temperature_2m),
          humidity: Math.round(weatherData.current.relative_humidity_2m),
          windSpeed: Math.round(weatherData.current.wind_speed_10m),
          rainfall: weatherData.current.precipitation || 0,
          condition: getWeatherCondition(weatherData.current.temperature_2m, weatherData.current.precipitation),
          forecast: weatherData.daily.time.map((date, idx) => ({
            date,
            temp: Math.round(weatherData.daily.temperature_2m_max[idx]),
            rainfall: weatherData.daily.precipitation_sum[idx] || 0
          }))
        });
      }
    } catch (error) {
      // Silently fail - weather is optional
      console.log('Weather fetch failed (optional):', error.message);
    }
  };

  const getWeatherCondition = (temp, rainfall) => {
    if (rainfall > 0) return 'Rainy';
    if (temp > 35) return 'Hot';
    if (temp > 25) return 'Warm';
    if (temp > 15) return 'Pleasant';
    return 'Cool';
  };

  const fetchTopNotifications = async () => {
    try {
      const response = await api.get('/notifications/all?limit=5');
      setNotifications(response.data.notifications.filter(n => !n.isRead));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/requests/active');
      setStats(prev => ({
        ...prev,
        activeRequests: response.data.count
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const setupRealtimeUpdates = () => {
    const socket = getSocket();
    if (socket) {
      socket.on('sensorUpdate', (data) => {
        setSensorData(data);
        
        // Only show ESP32 as connected if data has source from krishi-sakha or deviceId from ESP32
        const isRealESP32 = data.deviceId?.includes('ESP32') || data.source === 'krishi-sakha';
        setEsp32Connected(isRealESP32);
        setLastUpdateTime(new Date());
        
        if (isRealESP32) {
          console.log('✅ Live sensor data from ESP32:', data);
        } else {
          console.log('📊 Simulated sensor data:', data);
        }
      });

      socket.on('requestUpdate', (data) => {
        console.log('📬 Request update received:', data);
        
        // Show different toast based on status
        if (data.status === 'accepted') {
          toast.success(
            `✅ ${data.agentName} accepted your ${data.service} request!`,
            {
              duration: 6000,
              icon: '🎉',
              style: {
                background: '#10B981',
                color: '#fff',
              },
            }
          );
        } else if (data.status === 'rejected') {
          toast.error(
            `❌ ${data.agentName} declined your ${data.service} request`,
            {
              duration: 5000,
              style: {
                background: '#EF4444',
                color: '#fff',
              },
            }
          );
        } else if (data.status === 'completed') {
          toast.success(
            `✓ ${data.agentName} completed the ${data.service} service!`,
            {
              duration: 5000,
              icon: '🎊',
            }
          );
        } else {
          toast(`Request ${data.status}: ${data.agentName}`);
        }
        
        // Refresh stats and notifications
        fetchStats();
        fetchTopNotifications();
      });
      
      // Check if we already have recent data (from previous page)
      if (sensorData) {
        const now = new Date();
        const dataTime = new Date(sensorData.timestamp || sensorData.createdAt);
        const timeDiff = (now - dataTime) / 1000; // seconds
        
        // If data is less than 30 seconds old, consider ESP32 connected
        if (timeDiff < 30) {
          const isRealESP32 = sensorData.deviceId?.includes('ESP32') || sensorData.source === 'krishi-sakha';
          setEsp32Connected(isRealESP32);
          setLastUpdateTime(dataTime);
        }
      }
    }

    // Check connection status every 10 seconds (reduced from 30)
    const connectionCheck = setInterval(() => {
      if (lastUpdateTime) {
        const timeSinceUpdate = (new Date() - lastUpdateTime) / 1000;
        if (timeSinceUpdate >= 30) { // Consider disconnected after 30 seconds (reduced from 60)
          setEsp32Connected(false);
        }
      }
    }, 10000);

    return () => {
      clearInterval(connectionCheck);
      // Don't remove socket listeners - keep them active for navigation
    };
  };

  const checkAlerts = () => {
    if (!sensorData || !esp32Connected) return [];
    
    const alerts = [];
    if (sensorData.temperature > 35) {
      alerts.push({ type: 'warning', message: 'Heat stress alert - Temperature too high' });
    }
    if (sensorData.humidity > 85) {
      alerts.push({ type: 'warning', message: 'High humidity - Disease risk, consider spraying' });
    }
    if (sensorData.soilMoisture < 30) {
      alerts.push({ type: 'danger', message: 'Low soil moisture - Irrigation needed' });
    }
    if (sensorData.pH < 5.5 || sensorData.pH > 8.0) {
      alerts.push({ type: 'info', message: 'pH imbalance detected' });
    }
    return alerts;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar role="farmer" />
        <Loading />
      </div>
    );
  }

  const alerts = checkAlerts();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-2">Here's what's happening on your farm today</p>
        </div>

        {/* Weather Widget */}
        {weather && (
          <Card className="mb-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <CloudRain className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-4xl font-bold">{weather.temperature}°C</p>
                  <p className="text-sm opacity-90">{weather.condition}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5" />
                    <span>Humidity: {weather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="w-5 h-5" />
                    <span>Wind: {weather.windSpeed} km/h</span>
                  </div>
                  {weather.rainfall > 0 && (
                    <div className="flex items-center gap-2">
                      <CloudRain className="w-5 h-5" />
                      <span>Rainfall: {weather.rainfall} mm</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90 mb-2">7-Day Forecast</p>
                <div className="flex gap-2">
                  {weather.forecast.slice(0, 7).map((day, idx) => (
                    <div key={idx} className="text-center bg-white/20 rounded-lg p-2">
                      <p className="text-xs">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                      <p className="text-lg font-bold">{day.temp}°</p>
                      {day.rainfall > 0 && <p className="text-xs">☂️</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Top Priority Notifications */}
        {notifications.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Bell className="w-6 h-6 text-red-600" />
                Priority Alerts
              </h2>
              <button
                onClick={() => navigate('/farmer/notifications')}
                className="text-green-600 font-semibold hover:underline flex items-center gap-1"
              >
                View All ({notifications.length})
              </button>
            </div>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <Card
                  key={notification._id}
                  className={`cursor-pointer hover:shadow-lg transition ${
                    notification.type === 'critical' ? 'border-l-4 border-red-500 bg-red-50' :
                    notification.type === 'alert' ? 'border-l-4 border-orange-500 bg-orange-50' :
                    notification.type === 'warning' ? 'border-l-4 border-yellow-500 bg-yellow-50' :
                    notification.type === 'success' ? 'border-l-4 border-green-500 bg-green-50' :
                    'border-l-4 border-blue-500 bg-blue-50'
                  }`}
                  onClick={() => navigate('/farmer/notifications')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 mb-1">{notification.title}</h3>
                      <p className="text-sm text-gray-700">{notification.message}</p>
                    </div>
                    <Bell className="w-5 h-5 text-gray-500" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  alert.type === 'danger' ? 'bg-red-100 text-red-800' :
                  alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                <Bell className="w-5 h-5" />
                <span className="font-medium">{alert.message}</span>
                <button
                  onClick={() => navigate('/farmer/find-labour')}
                  className="ml-auto px-4 py-2 bg-white rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Find Labour
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Live Sensor Data */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800">Live Sensor Readings</h2>
              {/* ESP32 Connection Status */}
              {esp32Connected ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                  ESP32 Connected
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                  <div className="w-2 h-2 rounded-full bg-red-600" />
                  ESP32 Not Connected
                </div>
              )}
            </div>
            <span className="text-sm text-gray-600">
              {lastUpdateTime ? (
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Last update: {lastUpdateTime.toLocaleTimeString()}
                </span>
              ) : (
                'Waiting for ESP32...'
              )}
            </span>
          </div>
          
          {esp32Connected && sensorData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <StatCard
                icon={Thermometer}
                label="Temperature"
                value={`${sensorData.temperature.toFixed(1)}°C`}
                color={sensorData.temperature > 35 ? 'red' : 'green'}
              />
              <StatCard
                icon={Droplets}
                label="Humidity"
                value={`${sensorData.humidity.toFixed(1)}%`}
                color={sensorData.humidity > 85 ? 'yellow' : 'blue'}
              />
              <StatCard
                icon={Sprout}
                label="Soil Moisture"
                value={`${sensorData.soilMoisture.toFixed(1)}%`}
                color={sensorData.soilMoisture < 30 ? 'red' : 'green'}
              />
              <StatCard
                icon={CloudRain}
                label="Rain Level"
                value={`${(sensorData.rainLevel || 0).toFixed(0)}%`}
                color={(sensorData.rainLevel || 0) > 50 ? 'blue' : 'gray'}
              />
              <StatCard
                icon={FlaskConical}
                label="pH Level"
                value={sensorData.pH.toFixed(2)}
                color={(sensorData.pH < 5.5 || sensorData.pH > 8.0) ? 'yellow' : 'green'}
              />
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                  <Activity className="w-10 h-10 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">ESP32 Not Connected</h3>
                  <p className="text-gray-600 mb-4">Please connect your ESP32 device to view live sensor data</p>
                  <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                    <p className="text-sm text-gray-700 mb-2 font-semibold">Connection Steps:</p>
                    <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                      <li>Power on your ESP32 device</li>
                      <li>Ensure it's connected to WiFi</li>
                      <li>Verify the server address in ESP32 code</li>
                      <li>Check that sensor backend is running on port 3000</li>
                    </ol>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <button
              onClick={() => navigate('/farmer/find-labour')}
              className="p-6 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex flex-col items-center gap-3"
            >
              <Search className="w-8 h-8" />
              <span className="font-semibold">Find Labour</span>
            </button>
            
            <button
              onClick={() => navigate('/farmer/crop-recommendation')}
              className="p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex flex-col items-center gap-3"
            >
              <Sprout className="w-8 h-8" />
              <span className="font-semibold">Crop Recommendation</span>
            </button>
            
            <button
              onClick={() => navigate('/farmer/disease-check')}
              className="p-6 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex flex-col items-center gap-3"
            >
              <Activity className="w-8 h-8" />
              <span className="font-semibold">Disease Check</span>
            </button>
            
            <button
              onClick={() => navigate('/farmer/mandi-prices')}
              className="p-6 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition flex flex-col items-center gap-3"
            >
              <ShoppingBag className="w-8 h-8" />
              <span className="font-semibold">Mandi Prices</span>
            </button>
            
            <button
              onClick={() => navigate('/farmer/analytics')}
              className="p-6 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition flex flex-col items-center gap-3"
            >
              <BarChart3 className="w-8 h-8" />
              <span className="font-semibold">Analytics</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={Bell}
            label="Active Requests"
            value={stats.activeRequests}
            color="blue"
          />
          <StatCard
            icon={Activity}
            label="Alerts"
            value={alerts.length}
            color={alerts.length > 0 ? 'red' : 'green'}
          />
          <StatCard
            icon={Sprout}
            label="Farm Size"
            value={`${user?.farmSize || 0} acres`}
            color="green"
          />
        </div>
      </div>
      
      {/* Voice Assistant */}
      <VoiceAssistant />
    </div>
  );
};

export default FarmerDashboard;
