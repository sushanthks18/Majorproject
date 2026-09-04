import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Card, { StatCard } from '../../components/Card';
import VoiceAssistant from '../../components/VoiceAssistant';
import { Thermometer, Droplets, Sprout, FlaskConical, Search, Activity, TrendingUp, Bell, BarChart3, ShoppingBag, CloudRain, Wind, Eye, MapPin, Lock, Calendar, ChevronRight, Clock, Beaker, Snowflake } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';
import Loading from '../../components/Loading';
import { MapContainer, TileLayer, Marker, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const FarmerDashboard = () => {
  const { user } = useAuth();
  const { t, getCropName, isKannada, language } = useLanguage();
  const navigate = useNavigate();
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [fields, setFields] = useState([]);
  const [stats, setStats] = useState({
    activeRequests: 0,
    completedJobs: 0,
    alerts: 0
  });

  // Debug logging
  useEffect(() => {
    console.log('Current language:', language);
    console.log('Is Kannada:', isKannada);
    console.log('Dashboard translation:', t('dashboard'));
    console.log('Welcome translation:', t('welcomeBack'));
  }, [language, isKannada, t]);

  useEffect(() => {
    fetchSensorData();
    fetchStats();
    fetchWeather();
    fetchTopNotifications();
    fetchFields();
    setupRealtimeUpdates();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await api.get('/fields');
      setFields(response.data);
    } catch (error) {
      console.error('Error fetching fields:', error);
    }
  };

  const fetchSensorData = async () => {
    try {
      const response = await api.get('/sensors/latest');
      console.log('Sensor API response:', response.data);
      
      // Handle direct data (no nesting)
      const data = response.data;
      
      if (data && data.temperature !== undefined) {
        setSensorData(data);
        console.log('✅ Sensor data loaded:', data);
        
        // Check if this is recent ESP32 data
        const now = new Date();
        const dataTime = new Date(data.timestamp || data.createdAt);
        const timeDiff = (now - dataTime) / 1000;
        
        console.log('Time difference:', timeDiff, 'seconds');
        
        // If data is less than 60 seconds old and has ESP32 markers
        if (timeDiff < 60) {
          const isRealESP32 = data.deviceId?.includes('ESP32') || data.source === 'krishi-sakha';
          if (isRealESP32) {
            setEsp32Connected(true);
            setLastUpdateTime(dataTime);
            console.log('💚 ESP32 Connected!');
          } else {
            console.log('🟡 Using default/simulated data');
          }
        } else {
          console.log('⚠️  Data is', Math.floor(timeDiff), 'seconds old');
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
      console.log('🔌 Setting up WebSocket listeners...');
      
      socket.on('sensorUpdate', (data) => {
        console.log('📡 Received sensor update:', data);
        setSensorData(data);
        
        // Check if this is ESP32 data
        const isRealESP32 = data.deviceId?.includes('ESP32') || data.source === 'krishi-sakha';
        setEsp32Connected(isRealESP32);
        setLastUpdateTime(new Date());
        
        if (isRealESP32) {
          console.log('✅ Live ESP32 data:', data);
          // Notification removed as per user request
        } else {
          console.log('📊 Simulated data:', data);
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
        }
      });

      // Clean up on unmount
      return () => {
        socket.off('sensorUpdate');
        socket.off('requestUpdate');
        // Don't remove socket listeners - keep them active for navigation
      };
    };
  };

  // Check for critical alerts
  const checkAlerts = () => {
    const alerts = [];
    
    if (sensorData) {
      // Temperature alerts
      if (sensorData.temperature > 40) {
        alerts.push({
          type: 'critical',
          key: 'extremeHeat',
          icon: <Thermometer className="w-5 h-5" />
        });
      } else if (sensorData.temperature < 10) {
        alerts.push({
          type: 'warning',
          key: 'coldTemperature',
          icon: <Snowflake className="w-5 h-5" />
        });
      }
      
      // Soil moisture alerts
      if (sensorData.soilMoisture < 30) {
        alerts.push({
          type: 'critical',
          key: 'soilMoistureLow',
          icon: <Droplets className="w-5 h-5" />
        });
      } else if (sensorData.soilMoisture > 80) {
        alerts.push({
          type: 'warning',
          key: 'soilMoistureHigh',
          icon: <Droplets className="w-5 h-5" />
        });
      }
      
      // pH alerts
      if (sensorData.pH < 5.5 || sensorData.pH > 8.5) {
        alerts.push({
          type: 'critical',
          key: 'phOutOfRange',
          icon: <Beaker className="w-5 h-5" />
        });
      }
    }
    
    return alerts;
  };

  const alerts = checkAlerts();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            {t('welcomeBack')}, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-2">{t('farmStatus')}</p>
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
                    <span>{t('humidity')}: {weather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="w-5 h-5" />
                    <span>{t('wind')}: {weather.windSpeed} km/h</span>
                  </div>
                  {weather.rainfall > 0 && (
                    <div className="flex items-center gap-2">
                      <CloudRain className="w-5 h-5" />
                      <span>{t('rainfall')}: {weather.rainfall} mm</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">{t('lastUpdated')}</p>
                <p className="font-semibold">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Live Sensor Data */}
        {sensorData && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">📡 {t('liveSensorData')}</h2>
              {esp32Connected && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-700">{t('esp32Connected')}</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Temperature */}
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('temperature')}</p>
                    <p className="text-3xl font-bold text-gray-800">{sensorData.temperature}°C</p>
                  </div>
                  <Thermometer className="w-10 h-10 text-red-500" />
                </div>
              </Card>

              {/* Humidity */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('humidity')}</p>
                    <p className="text-3xl font-bold text-gray-800">{sensorData.humidity}%</p>
                  </div>
                  <Droplets className="w-10 h-10 text-blue-500" />
                </div>
              </Card>

              {/* Soil Moisture */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('soilMoisture')}</p>
                    <p className="text-3xl font-bold text-gray-800">{sensorData.soilMoisture}%</p>
                  </div>
                  <Sprout className="w-10 h-10 text-green-500" />
                </div>
              </Card>

              {/* pH Level */}
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('phLevel')}</p>
                    <p className="text-3xl font-bold text-gray-800">{sensorData.pH}</p>
                  </div>
                  <FlaskConical className="w-10 h-10 text-purple-500" />
                </div>
              </Card>
            </div>
            
            {lastUpdateTime && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                {t('lastUpdated')}: {lastUpdateTime.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {/* Critical Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🚨 {t('criticalAlerts')}</h2>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <Card 
                  key={index} 
                  className={`border-l-4 ${
                    alert.type === 'critical' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={alert.type === 'critical' ? 'text-red-600' : 'text-yellow-600'}>
                      {alert.icon}
                    </div>
                    <p className={alert.type === 'critical' ? 'text-red-800 font-semibold' : 'text-yellow-800 font-semibold'}>
                      {t(alert.key)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Fields Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">🌾 {t('myFields')}</h2>
            <button
              onClick={() => navigate('/farmer/fields')}
              className="px-4 py-2 text-green-600 hover:text-green-700 font-semibold flex items-center gap-2"
            >
              {t('viewAll')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {fields.length === 0 ? (
            <Card className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('noFieldsYet')}</h3>
              <p className="text-gray-500 mb-4">{t('addFirstField')}</p>
              <button
                onClick={() => navigate('/farmer/register-field')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {t('addFirstField')}
              </button>
            </Card>
          ) : (
            <div className="mb-6 space-y-6">
              {/* Interactive Field Boundary Map Integration requested by user */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                <div className="bg-green-600 px-4 py-3 text-white flex justify-between items-center">
                  <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-5 h-5"/> Live Farm Mapping Topography</h3>
                </div>
                <div className="h-[400px] w-full z-0 relative">
                  {fields.length > 0 && fields[0].centerLat && (
                    <MapContainer 
                      center={[fields[0].centerLat, fields[0].centerLng]} 
                      zoom={17} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer 
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                      />
                      {fields.map(field => {
                        const coords = field.boundary?.coordinates?.[0];
                        // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
                        const mapPositions = coords ? coords.map(c => [c[1], c[0]]) : [];
                        return (
                          <React.Fragment key={field._id}>
                            <Marker position={[field.centerLat, field.centerLng]}>
                              <Popup>
                                <div className="text-center font-semibold text-lg">{field.name}</div>
                                <div className="text-gray-600 text-sm">Crop: {getCropName(field.cropType || 'Unknown')}</div>
                              </Popup>
                            </Marker>
                            {mapPositions.length > 0 && (
                              <Polygon 
                                positions={mapPositions} 
                                pathOptions={{ color: 'green', weight: 4, fillColor: '#22c55e', fillOpacity: 0.3 }} 
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </MapContainer>
                  )}
                </div>
              </div>

              {/* Grid cards wrapper */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fields.slice(0, 3).map(field => (
                <Card 
                  key={field._id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/farmer/satellite-monitoring/${field._id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">{field.name}</h3>
                    {field.isCropLocked && (
                      <Lock className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{field.areaHectares} hectares</span>
                    </div>
                    
                    {field.cropType && (
                      <div className="flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-green-600" />
                        <span>{getCropName(field.cropType)}</span>
                      </div>
                    )}
                    
                    {field.isCropLocked && field.lockedCrop && (
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600 font-medium">Locked: {getCropName(field.lockedCrop)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Registered: {new Date(field.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/farmer/satellite-monitoring/${field._id}`);
                      }}
                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Monitor
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/farmer/irrigation/${field._id}`);
                      }}
                      className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                    >
                      Irrigation
                    </button>
                  </div>
                </Card>
              ))}
            </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">⚡ {t('quickActions')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <button
              onClick={() => navigate('/farmer/find-labour')}
              className="p-6 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex flex-col items-center gap-3"
            >
              <Search className="w-8 h-8" />
              <span className="font-semibold">{t('findLabour')}</span>
            </button>
            
            <button
              onClick={() => navigate('/farmer/crop-recommendation')}
              className="p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex flex-col items-center gap-3"
            >
              <Sprout className="w-8 h-8" />
              <span className="font-semibold">{t('cropRecommendation')}</span>
            </button>
            
            <button
              onClick={() => navigate('/farmer/disease-check')}
              className="p-6 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex flex-col items-center gap-3"
            >
              <Activity className="w-8 h-8" />
              <span className="font-semibold">{t('diseaseCheck')}</span>
            </button>
            
            <button
              onClick={() => navigate('/farmer/mandi-prices')}
              className="p-6 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition flex flex-col items-center gap-3"
            >
              <TrendingUp className="w-8 h-8" />
              <span className="font-semibold">{t('mandiPrices')}</span>
            </button>
            
            <button
              onClick={() => navigate('/farmer/analytics')}
              className="p-6 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition flex flex-col items-center gap-3"
            >
              <BarChart3 className="w-8 h-8" />
              <span className="font-semibold">{t('analytics')}</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">🕒 {t('recentActivity')}</h2>
          <Card>
            <div className="py-8 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('recentActivity')}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;