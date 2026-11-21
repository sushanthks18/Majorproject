import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Card, { StatCard } from '../../components/Card';
import VoiceAssistant from '../../components/VoiceAssistant';
import {
  Thermometer, Droplets, Sprout, Search, Activity, TrendingUp, Bell,
  BarChart3, ShoppingBag, CloudRain, Wind, Eye, MapPin, Lock,
  Calendar, ChevronRight, Clock, Snowflake, Wifi, WifiOff,
  RefreshCw, Copy, Check, Radio, Server, Signal, Cpu,
  Sun, Moon, Cloud, CloudSun, CloudMoon, CloudDrizzle, CloudLightning,
  CloudFog, CloudRainWind
} from 'lucide-react';
import api from '../../utils/api';
import { getSocket, reconnectSocket } from '../../utils/socket';
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
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [fields, setFields] = useState([]);
  const [stats, setStats] = useState({
    activeRequests: 0,
    completedJobs: 0,
    alerts: 0
  });

  // Cloud vs Local Backend Detection
  const cloudBackendUrl = import.meta.env.VITE_API_URL || '';
  const isCloudActive = Boolean(cloudBackendUrl && !cloudBackendUrl.includes('localhost') && !cloudBackendUrl.includes('127.0.0.1'));

  // IoT Gateway & Server IP configuration state (for offline/local mode)
  const [serverIp, setServerIp] = useState(
    localStorage.getItem('krishi_custom_server_ip') || (window.location.hostname !== 'localhost' ? window.location.hostname : '127.0.0.1')
  );
  const [ipStatus, setIpStatus] = useState('checking'); // 'connected' | 'checking' | 'error'
  const [detectedIps, setDetectedIps] = useState([]);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [loraTelemetry, setLoraTelemetry] = useState(null);

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
    initGatewayConnection();

    // Continuous 3-second polling to ensure live updates without relying solely on WebSockets
    const pollInterval = setInterval(() => {
      fetchSensorData();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (user?.id || user?._id) {
      setupRealtimeUpdates();
      fetchSensorData();
    }
  }, [user]);

  const testIpReachable = async (ip) => {
    if (!ip) return false;
    const cleanIp = ip.trim().replace(/^https?:\/\//i, '').replace(/:\d+$/, '').replace(/\/.*$/, '');
    try {
      const res = await fetch(`http://${cleanIp}:5001/api/sensors/ping`, {
        signal: AbortSignal.timeout(2000)
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const fetchNetworkIpFromBackend = async () => {
    // Try multiple reliable endpoints independently of axios baseURL:
    const candidates = [
      '/api/sensors/network-ip',
      `http://${window.location.hostname}:5001/api/sensors/network-ip`,
      'http://localhost:5001/api/sensors/network-ip',
      'http://127.0.0.1:5001/api/sensors/network-ip'
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.currentIp) {
            return data;
          }
        }
      } catch (e) {
        // Try next candidate
      }
    }
    return null;
  };

  const initGatewayConnection = async () => {
    try {
      const savedIp = localStorage.getItem('krishi_custom_server_ip');
      if (savedIp) {
        const isReachable = await testIpReachable(savedIp);
        if (isReachable) {
          setServerIp(savedIp);
          setIpStatus('connected');
          const netData = await fetchNetworkIpFromBackend();
          if (netData?.allIps) setDetectedIps(netData.allIps);
          return;
        } else {
          console.warn(`Saved IP ${savedIp} unreachable. Clearing.`);
          localStorage.removeItem('krishi_custom_server_ip');
        }
      }
      // Auto-detect fresh real Wi-Fi IP
      await detectNetworkIp(false);
    } catch (err) {
      console.log('Init gateway error:', err.message);
    }
  };

  const detectNetworkIp = async (isManualClick = false) => {
    try {
      setIpStatus('checking');
      if (isManualClick) {
        localStorage.removeItem('krishi_custom_server_ip');
      }
      const netData = await fetchNetworkIpFromBackend();
      if (netData && netData.success && netData.currentIp) {
        const realIp = netData.currentIp;
        setDetectedIps(netData.allIps || []);
        setServerIp(realIp);
        await checkGatewayIp(realIp, isManualClick);
        if (isManualClick) {
          toast.success(`🎯 Detected Real Wi-Fi IP: ${realIp}`);
        }
      } else {
        setIpStatus('error');
        if (isManualClick) toast.error('Could not detect Wi-Fi IP from backend');
      }
    } catch (error) {
      setIpStatus('error');
      console.log('IP auto-detection notice:', error.message);
      if (isManualClick) toast.error('Failed to query backend network IP');
    }
  };

  const checkGatewayIp = async (ipToCheck, showToast = true) => {
    if (!ipToCheck || !ipToCheck.trim()) {
      setIpStatus('error');
      if (showToast) toast.error('Please enter a valid IP address');
      return;
    }
    const cleanIp = ipToCheck.trim().replace(/^https?:\/\//i, '').replace(/:\d+$/, '').replace(/\/.*$/, '');
    setIpStatus('checking');
    try {
      const response = await fetch(`http://${cleanIp}:5001/api/sensors/ping`, {
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        setIpStatus('connected');
        localStorage.setItem('krishi_custom_server_ip', cleanIp);
        setServerIp(cleanIp);
        reconnectSocket(user?._id);
        fetchSensorData();
        if (showToast) toast.success(`Connected to Gateway at ${cleanIp}:5001`);
      } else {
        setIpStatus('error');
        if (showToast) toast.error(`Server at ${cleanIp}:5001 returned error`);
      }
    } catch (err) {
      setIpStatus('error');
      if (showToast) toast.error(`Could not connect to ${cleanIp}:5001. Check Wi-Fi.`);
    }
  };

  const handleManualConnect = (e) => {
    if (e) e.preventDefault();
    checkGatewayIp(serverIp, true);
  };

  const handleSelectIp = (ip) => {
    setServerIp(ip);
    checkGatewayIp(ip, true);
  };

  const handleResetIp = () => {
    localStorage.removeItem('krishi_custom_server_ip');
    detectNetworkIp(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(true);
    toast.success('ESP32 Arduino Endpoint URL copied!');
    setTimeout(() => setCopiedEndpoint(false), 2500);
  };

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
        
        if (data.packetNum !== undefined || data.rssi !== undefined || data.soilRaw !== undefined) {
          setLoraTelemetry({
            packetNum: data.packetNum,
            rssi: data.rssi,
            soilRaw: data.soilRaw,
            deviceId: data.deviceId,
            source: data.source,
            timestamp: data.timestamp || new Date()
          });
        }
        
        // Check if this is recent ESP32 data
        const now = new Date();
        const dataTime = new Date(data.timestamp || data.createdAt);
        const timeDiff = (now - dataTime) / 1000;
        
        console.log('Time difference:', timeDiff, 'seconds');
        
        if (dataTime && !isNaN(dataTime.getTime())) {
          setLastUpdateTime(dataTime);
        }

        // If data is less than 5 minutes old
        if (timeDiff < 300) {
          setEsp32Connected(true);
          console.log('💚 ESP32/LoRa Connected!');
        } else {
          setEsp32Connected(false);
          console.log('⚠️  Data is', Math.floor(timeDiff), 'seconds old');
        }
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherMeta = (code, isDay = 1, rainfall = 0, temp = 25) => {
    if (code !== undefined && code !== null) {
      switch (Number(code)) {
        case 0:
          return {
            key: 'weatherClearSky',
            label: isDay ? 'Clear Sky' : 'Clear Night',
            Icon: isDay ? Sun : Moon,
            colorClass: isDay ? 'text-amber-300' : 'text-blue-200',
            forecastColor: isDay ? 'text-amber-500' : 'text-indigo-400',
            bgGradient: isDay
              ? 'from-blue-600 via-sky-600 to-amber-500'
              : 'from-slate-900 via-indigo-950 to-slate-800'
          };
        case 1:
          return {
            key: 'weatherMainlyClear',
            label: 'Mainly Clear',
            Icon: isDay ? Sun : Moon,
            colorClass: isDay ? 'text-amber-200' : 'text-blue-200',
            forecastColor: isDay ? 'text-amber-500' : 'text-indigo-400',
            bgGradient: isDay
              ? 'from-sky-500 via-blue-500 to-cyan-600'
              : 'from-slate-900 via-indigo-900 to-slate-950'
          };
        case 2:
          return {
            key: 'weatherPartlyCloudy',
            label: 'Partly Cloudy',
            Icon: isDay ? CloudSun : CloudMoon,
            colorClass: isDay ? 'text-amber-200' : 'text-slate-300',
            forecastColor: isDay ? 'text-amber-500' : 'text-slate-400',
            bgGradient: isDay
              ? 'from-blue-500 via-teal-600 to-cyan-700'
              : 'from-slate-900 via-slate-800 to-indigo-950'
          };
        case 3:
          return {
            key: 'weatherOvercast',
            label: 'Overcast',
            Icon: Cloud,
            colorClass: 'text-slate-200',
            forecastColor: 'text-slate-500',
            bgGradient: 'from-slate-600 via-slate-700 to-blue-800'
          };
        case 45:
        case 48:
          return {
            key: 'weatherFoggy',
            label: 'Foggy',
            Icon: CloudFog,
            colorClass: 'text-gray-200',
            forecastColor: 'text-gray-400',
            bgGradient: 'from-slate-600 via-gray-600 to-zinc-700'
          };
        case 51:
        case 53:
        case 55:
        case 56:
        case 57:
          return {
            key: 'weatherDrizzle',
            label: 'Drizzle',
            Icon: CloudDrizzle,
            colorClass: 'text-cyan-200',
            forecastColor: 'text-cyan-500',
            bgGradient: 'from-cyan-700 via-blue-700 to-indigo-800'
          };
        case 61:
        case 63:
        case 80:
        case 81:
          return {
            key: 'weatherRainy',
            label: 'Rainy',
            Icon: CloudRain,
            colorClass: 'text-blue-200',
            forecastColor: 'text-blue-500',
            bgGradient: 'from-blue-700 via-cyan-800 to-indigo-900'
          };
        case 65:
        case 82:
          return {
            key: 'weatherHeavyRain',
            label: 'Heavy Rain',
            Icon: CloudRainWind,
            colorClass: 'text-blue-300',
            forecastColor: 'text-blue-600',
            bgGradient: 'from-blue-800 via-indigo-900 to-slate-900'
          };
        case 66:
        case 67:
        case 71:
        case 73:
        case 75:
        case 77:
        case 85:
        case 86:
          return {
            key: 'weatherSnowy',
            label: 'Snowy',
            Icon: Snowflake,
            colorClass: 'text-sky-100',
            forecastColor: 'text-sky-400',
            bgGradient: 'from-sky-700 via-indigo-700 to-slate-800'
          };
        case 95:
        case 96:
        case 99:
          return {
            key: 'weatherThunderstorm',
            label: 'Thunderstorm',
            Icon: CloudLightning,
            colorClass: 'text-amber-300',
            forecastColor: 'text-purple-500',
            bgGradient: 'from-indigo-900 via-purple-950 to-slate-950'
          };
        default:
          break;
      }
    }

    if (rainfall > 0) {
      return {
        key: 'weatherRainy',
        label: 'Rainy',
        Icon: CloudRain,
        colorClass: 'text-blue-200',
        forecastColor: 'text-blue-500',
        bgGradient: 'from-blue-600 via-cyan-700 to-indigo-800'
      };
    }
    if (temp > 35) {
      return {
        key: 'weatherClearSky',
        label: 'Hot & Sunny',
        Icon: Sun,
        colorClass: 'text-amber-400',
        forecastColor: 'text-amber-500',
        bgGradient: 'from-amber-500 via-orange-500 to-red-500'
      };
    }
    if (temp > 25) {
      return {
        key: 'weatherPartlyCloudy',
        label: 'Warm & Clear',
        Icon: isDay ? CloudSun : CloudMoon,
        colorClass: 'text-amber-200',
        forecastColor: 'text-amber-500',
        bgGradient: 'from-blue-500 via-sky-500 to-cyan-600'
      };
    }
    return {
      key: 'weatherPartlyCloudy',
      label: 'Pleasant',
      Icon: CloudSun,
      colorClass: 'text-blue-100',
      forecastColor: 'text-blue-500',
      bgGradient: 'from-blue-500 to-cyan-500'
    };
  };

  const formatForecastDay = (dateStr, index, isKn) => {
    if (index === 0) return isKn ? 'ಇಂದು' : 'Today';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(isKn ? 'kn-IN' : 'en-US', { weekday: 'short' });
    } catch {
      return `Day ${index + 1}`;
    }
  };

  const formatForecastDate = (dateStr, isKn) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(isKn ? 'kn-IN' : 'en-US', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const getFallbackWeather = () => {
    const today = new Date();
    const mockForecast = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isRain = i === 2 || i === 5;
      const wCode = isRain ? 61 : (i === 1 || i === 4 ? 2 : 0);
      return {
        date: dateStr,
        temp: isRain ? 25 : 29 - (i % 2),
        tempMax: isRain ? 27 : 30 - (i % 2),
        tempMin: isRain ? 19 : 18 - (i % 3),
        rainfall: isRain ? 6.5 : 0,
        rainProb: isRain ? 75 : 10,
        weatherCode: wCode,
        condition: isRain ? 'Rainy' : (wCode === 2 ? 'Partly Cloudy' : 'Clear Sky'),
        conditionKey: isRain ? 'weatherRainy' : (wCode === 2 ? 'weatherPartlyCloudy' : 'weatherClearSky')
      };
    });
    return {
      temperature: 27,
      apparentTemperature: 28,
      humidity: 58,
      windSpeed: 11,
      rainfall: 0,
      rainProb: 15,
      weatherCode: 1,
      isDay: 1,
      tempMax: 29,
      tempMin: 18,
      condition: 'Mainly Clear',
      conditionKey: 'weatherMainlyClear',
      updatedAt: new Date(),
      forecast: mockForecast
    };
  };

  const fetchWeather = async () => {
    try {
      setWeatherLoading(true);
      let lat = user?.location?.lat || 12.9716;
      let lng = user?.location?.lng || 77.5946;
      
      // Fallback to Bangalore coordinates if invalid
      if (!lat || !lng || lat === 0 || lng === 0) {
        lat = 12.9716;
        lng = 77.5946;
      }
      
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,is_day,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=7`,
        { signal: AbortSignal.timeout(6000) }
      );
      
      if (weatherResponse.ok) {
        const weatherData = await weatherResponse.json();
        const currentCode = weatherData.current?.weather_code ?? 0;
        const isDay = weatherData.current?.is_day ?? 1;
        const currentMeta = getWeatherMeta(
          currentCode,
          isDay,
          weatherData.current?.precipitation,
          weatherData.current?.temperature_2m
        );

        setWeather({
          temperature: Math.round(weatherData.current.temperature_2m),
          apparentTemperature: Math.round(weatherData.current.apparent_temperature ?? weatherData.current.temperature_2m),
          humidity: Math.round(weatherData.current.relative_humidity_2m),
          windSpeed: Math.round(weatherData.current.wind_speed_10m),
          rainfall: weatherData.current.precipitation ?? 0,
          weatherCode: currentCode,
          isDay: isDay,
          condition: currentMeta.label,
          conditionKey: currentMeta.key,
          tempMax: Math.round(weatherData.daily?.temperature_2m_max?.[0] ?? weatherData.current.temperature_2m),
          tempMin: Math.round(weatherData.daily?.temperature_2m_min?.[0] ?? weatherData.current.temperature_2m),
          updatedAt: new Date(),
          forecast: (weatherData.daily?.time || []).map((date, idx) => {
            const fCode = weatherData.daily?.weather_code?.[idx] ?? 0;
            const fMeta = getWeatherMeta(
              fCode,
              1,
              weatherData.daily?.precipitation_sum?.[idx],
              weatherData.daily?.temperature_2m_max?.[idx]
            );
            return {
              date,
              temp: Math.round(weatherData.daily?.temperature_2m_max?.[idx] ?? 0),
              tempMax: Math.round(weatherData.daily?.temperature_2m_max?.[idx] ?? 0),
              tempMin: Math.round(weatherData.daily?.temperature_2m_min?.[idx] ?? 0),
              rainfall: Math.round((weatherData.daily?.precipitation_sum?.[idx] || 0) * 10) / 10,
              rainProb: weatherData.daily?.precipitation_probability_max?.[idx] ?? 0,
              weatherCode: fCode,
              condition: fMeta.label,
              conditionKey: fMeta.key
            };
          })
        });
      } else {
        throw new Error(`Weather service responded with status ${weatherResponse.status}`);
      }
    } catch (error) {
      console.log('Weather fetch notice:', error.message);
      // Fallback data if no weather data loaded yet
      setWeather(prev => prev || getFallbackWeather());
    } finally {
      setWeatherLoading(false);
    }
  };

  const getWeatherCondition = (temp, rainfall, code = null, isDay = 1) => {
    return getWeatherMeta(code, isDay, rainfall, temp).label;
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
    let socket = getSocket();
    if (!socket && (user?.id || user?._id)) {
      socket = connectSocket(user?.id || user?._id);
    }
    if (socket) {
      console.log('🔌 Setting up WebSocket listeners...');
      
      socket.off('sensorUpdate');
      socket.on('sensorUpdate', (data) => {
        console.log('📡 Received sensor update:', data);
        if (data) {
          setSensorData(data);
          setEsp32Connected(true);
          const updateTime = new Date(data.timestamp || Date.now());
          setLastUpdateTime(updateTime);
          
          if (data.packetNum !== undefined || data.rssi !== undefined || data.soilRaw !== undefined) {
            setLoraTelemetry({
              packetNum: data.packetNum,
              rssi: data.rssi,
              soilRaw: data.soilRaw,
              deviceId: data.deviceId,
              source: data.source,
              timestamp: updateTime
            });
          }
          console.log('✅ Live ESP32/LoRa data updated:', data);
        }
      });

      socket.off('connect');
      socket.on('connect', () => {
        console.log('🔌 Socket reconnected, refreshing sensor data...');
        fetchSensorData();
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
      
      // Soil nutrient alerts (NPK)
      if (sensorData.nitrogen !== null && sensorData.nitrogen !== undefined && sensorData.nitrogen > 0 && sensorData.nitrogen < 20) {
        alerts.push({
          type: 'warning',
          key: 'nitrogenLow',
          icon: <Sprout className="w-5 h-5" />
        });
      }
      if (sensorData.potassium !== null && sensorData.potassium !== undefined && sensorData.potassium > 0 && sensorData.potassium < 50) {
        alerts.push({
          type: 'warning',
          key: 'potassiumLow',
          icon: <Activity className="w-5 h-5" />
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

        {/* Weather & 7-Day Forecast Section */}
        {weather && (() => {
          const currentMeta = getWeatherMeta(
            weather.weatherCode,
            weather.isDay,
            weather.rainfall,
            weather.temperature
          );
          const CurrentIcon = currentMeta.Icon;
          const currentCondition = t(weather.conditionKey) || weather.condition;
          
          // Determine agricultural advisory
          const rainUpcoming = weather.forecast?.slice(0, 3).some(d => d.rainProb >= 40 || d.rainfall >= 1.5);
          const highHeatUpcoming = weather.forecast?.slice(0, 3).some(d => d.tempMax >= 34);

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              {/* Card 1: Today's Weather Card */}
              <div className={`lg:col-span-5 bg-gradient-to-br ${currentMeta.bgGradient} text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between border border-white/10`}>
                {/* Background Watermark Icon */}
                <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none select-none">
                  <CurrentIcon className="w-56 h-56" />
                </div>

                <div>
                  {/* Top Bar: Location / Title + Refresh */}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm border border-white/20">
                        <MapPin className="w-3.5 h-3.5" />
                        {user?.city || user?.location?.name || 'Bengaluru, KA'}
                      </span>
                      <span className="text-xs text-white/80 font-medium">
                        {t('todayWeather')}
                      </span>
                    </div>

                    <button
                      onClick={() => fetchWeather()}
                      disabled={weatherLoading}
                      title={t('refreshData') || 'Refresh weather'}
                      className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white/90 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${weatherLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Main Weather Display */}
                  <div className="flex items-center gap-5 my-3 relative z-10">
                    <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner flex-shrink-0">
                      <CurrentIcon className={`w-14 h-14 ${currentMeta.colorClass} drop-shadow-md`} />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-sm">
                          {weather.temperature}°C
                        </span>
                      </div>
                      <p className="text-base font-semibold text-white/95 mt-0.5">
                        {currentCondition}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-white/80 mt-1">
                        <span>{t('highLow')}: {weather.tempMax}° / {weather.tempMin}°</span>
                        <span>•</span>
                        <span>{t('feelsLike')}: {weather.apparentTemperature}°C</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Metric Pill Box */}
                <div className="mt-5 pt-3 border-t border-white/15 relative z-10">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl py-2 px-2 border border-white/10">
                      <div className="flex items-center justify-center gap-1 text-white/75 text-xs mb-0.5">
                        <Droplets className="w-3.5 h-3.5" />
                        <span>{t('humidity')}</span>
                      </div>
                      <span className="font-bold text-sm">{weather.humidity}%</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl py-2 px-2 border border-white/10">
                      <div className="flex items-center justify-center gap-1 text-white/75 text-xs mb-0.5">
                        <Wind className="w-3.5 h-3.5" />
                        <span>{t('wind')}</span>
                      </div>
                      <span className="font-bold text-sm">{weather.windSpeed} km/h</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl py-2 px-2 border border-white/10">
                      <div className="flex items-center justify-center gap-1 text-white/75 text-xs mb-0.5">
                        <CloudRain className="w-3.5 h-3.5" />
                        <span>{t('rainfall')}</span>
                      </div>
                      <span className="font-bold text-sm">
                        {weather.rainfall > 0 ? `${weather.rainfall} mm` : `${weather.forecast?.[0]?.rainProb || 0}%`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/70 mt-3 px-1">
                    <span>{t('lastUpdated')}: {weather.updatedAt ? new Date(weather.updatedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}</span>
                    <span className="font-medium text-white/85">Open-Meteo Live</span>
                  </div>
                </div>
              </div>

              {/* Card 2: 7-Day Forecast Card */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  {/* Forecast Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-800">
                          {t('sevenDayForecast')}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {isKannada ? 'ಮುಂದಿನ 7 ದಿನಗಳ ಹವಾಮಾನ ಮತ್ತು ಕೃಷಿ ಮುನ್ಸೂಚನೆ' : 'Next 7 days weather & agricultural outlook'}
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      7 Days
                    </span>
                  </div>

                  {/* 7 Days Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {(weather.forecast || []).map((day, idx) => {
                      const dayMeta = getWeatherMeta(day.weatherCode, 1, day.rainfall, day.tempMax);
                      const DayIcon = dayMeta.Icon;
                      const dayLabel = formatForecastDay(day.date, idx, isKannada);
                      const dateLabel = formatForecastDate(day.date, isKannada);
                      const isToday = idx === 0;

                      return (
                        <div
                          key={day.date || idx}
                          className={`rounded-xl p-2.5 text-center flex flex-col items-center justify-between transition-all ${
                            isToday
                              ? 'bg-emerald-50/70 border-2 border-emerald-500 shadow-sm'
                              : 'bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/70'
                          }`}
                        >
                          {/* Day & Date */}
                          <div className="w-full">
                            <span className={`block text-xs font-bold truncate ${isToday ? 'text-emerald-700' : 'text-gray-700'}`}>
                              {dayLabel}
                            </span>
                            <span className="block text-[10px] text-gray-400 mt-0.5">
                              {dateLabel}
                            </span>
                          </div>

                          {/* Dynamic Condition Icon */}
                          <div className="my-2 p-1.5 rounded-full bg-white shadow-xs border border-gray-100">
                            <DayIcon className={`w-6 h-6 ${dayMeta.forecastColor}`} />
                          </div>

                          {/* Temperatures */}
                          <div className="w-full">
                            <div className="text-xs font-bold text-gray-800">
                              {day.tempMax}°
                              <span className="text-[11px] font-normal text-gray-400 ml-1">
                                {day.tempMin}°
                              </span>
                            </div>

                            {/* Rain probability */}
                            <div className="mt-1">
                              {day.rainProb > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                                  <Droplets className="w-2.5 h-2.5 text-blue-500" />
                                  {day.rainProb}%
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">
                                  0%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Agricultural Advisory Banner */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className={`rounded-xl p-3 text-xs flex items-center gap-2.5 ${
                    rainUpcoming
                      ? 'bg-blue-50 border border-blue-200 text-blue-800'
                      : highHeatUpcoming
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}>
                    {rainUpcoming ? (
                      <CloudRain className="w-4 h-4 flex-shrink-0 text-blue-600" />
                    ) : highHeatUpcoming ? (
                      <Sun className="w-4 h-4 flex-shrink-0 text-amber-600" />
                    ) : (
                      <Sprout className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    )}
                    <span className="font-medium">
                      {rainUpcoming
                        ? t('weatherRainWarning')
                        : highHeatUpcoming
                        ? t('weatherHeatWarning')
                        : t('weatherFavorable')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* IoT Gateway & Wi-Fi IP Connection Manager */}
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm p-4 transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${ipStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : ipStatus === 'checking' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-800">IoT Gateway & Server Endpoint</h3>
                  {isCloudActive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      <Server className="w-3.5 h-3.5 text-blue-600" />
                      Cloud Active ({new URL(cloudBackendUrl.startsWith('http') ? cloudBackendUrl : `http://${cloudBackendUrl}`).hostname})
                    </span>
                  ) : (
                    <>
                      {ipStatus === 'connected' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Local LAN ({serverIp}:5001)
                        </span>
                      )}
                      {ipStatus === 'checking' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Checking IP...
                        </span>
                      )}
                      {ipStatus === 'error' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                          <WifiOff className="w-3 h-3" />
                          Unreachable
                        </span>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isCloudActive
                    ? 'Connected to stable cloud backend. Network switches on MacBook will not interrupt sensor data stream.'
                    : 'Local development mode: change or auto-detect your Wi-Fi server IP if your router assigns a new address.'}
                </p>
              </div>
            </div>

            {/* Quick Action: Copy ESP32 POST Endpoint */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  const targetEndpoint = isCloudActive
                    ? (cloudBackendUrl.endsWith('/api') ? `${cloudBackendUrl}/sensors/data` : `${cloudBackendUrl}/api/sensors/data`)
                    : `http://${(serverIp || '127.0.0.1').trim().replace(/^https?:\/\//i, '').replace(/:\d+$/, '').replace(/\/.*$/, '')}:5001/api/sensors/data`;
                  copyToClipboard(targetEndpoint);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition cursor-pointer"
                title="Copy ESP32 Receiver HTTP/HTTPS POST URL"
              >
                {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEndpoint ? 'Copied URL!' : 'Copy ESP32 URL'}</span>
              </button>
            </div>
          </div>

          {/* Search / Manual IP Entry Form */}
          <form onSubmit={handleManualConnect} className="mt-3 flex flex-wrap md:flex-nowrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                placeholder={isCloudActive ? "Local IP override (optional fallback)" : "Enter server Wi-Fi IP (e.g., 192.168.1.54)"}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={ipStatus === 'checking'}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              {ipStatus === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              <span>Connect</span>
            </button>

            <button
              type="button"
              onClick={() => detectNetworkIp(true)}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition active:scale-95"
              title="Auto-detect real Wi-Fi IP address"
            >
              <Radio className="w-4 h-4" />
              <span>Auto-Detect</span>
            </button>

            <button
              type="button"
              onClick={handleResetIp}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium hover:bg-gray-100 rounded-lg transition"
              title="Reset to detected Wi-Fi IP"
            >
              Reset
            </button>
          </form>

          {/* Detected Real Wi-Fi Network IPs Chips */}
          {detectedIps.length > 0 && (
            <div className="mt-3 flex items-center flex-wrap gap-2 text-xs">
              <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Signal className="w-3.5 h-3.5 text-emerald-600" />
                Real Wi-Fi Network:
              </span>
              {detectedIps.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectIp(item.ip)}
                  className={`px-3 py-1 rounded-lg font-mono border transition flex items-center gap-1.5 shadow-sm ${
                    serverIp === item.ip
                      ? 'bg-emerald-600 border-emerald-700 text-white font-bold'
                      : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'
                  }`}
                  title={`Click to connect to ${item.ip}`}
                >
                  <span className={`w-2 h-2 rounded-full ${serverIp === item.ip ? 'bg-white animate-pulse' : 'bg-emerald-500'}`}></span>
                  <span>{item.interface}: <strong>{item.ip}</strong></span>
                </button>
              ))}
            </div>
          )}

          {/* LoRa Telemetry Bar (Live hardware status) */}
          {loraTelemetry && (
            <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50/80 -mx-4 -mb-4 p-3 rounded-b-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold font-mono">
                  <Signal className="w-3 h-3" />
                  LoRa 433 MHz
                </span>
                <span className="text-gray-700">
                  Packet: <strong className="font-mono text-gray-900">#{loraTelemetry.packetNum ?? '—'}</strong>
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-700">
                  RSSI: <strong className="font-mono text-gray-900">{loraTelemetry.rssi !== undefined ? `${loraTelemetry.rssi} dBm` : '—'}</strong>
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-700">
                  Soil ADC: <strong className="font-mono text-gray-900">{loraTelemetry.soilRaw ?? '—'}</strong>
                </span>
              </div>
              <div className="text-gray-500 text-[11px] font-mono">
                ESP32 Endpoint: <code className="bg-gray-200/80 px-1 py-0.5 rounded text-gray-800">http://{serverIp}:5001/api/sensors/data</code>
              </div>
            </div>
          )}
        </div>

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
                    <p className="text-3xl font-bold text-gray-800">
                      {sensorData.temperature !== null && sensorData.temperature !== undefined ? `${sensorData.temperature}°C` : '--'}
                    </p>
                  </div>
                  <Thermometer className="w-10 h-10 text-red-500" />
                </div>
              </Card>

              {/* Humidity */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('humidity')}</p>
                    <p className="text-3xl font-bold text-gray-800">
                      {sensorData.humidity !== null && sensorData.humidity !== undefined ? `${sensorData.humidity}%` : '--'}
                    </p>
                  </div>
                  <Droplets className="w-10 h-10 text-blue-500" />
                </div>
              </Card>

              {/* Soil Moisture */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('soilMoisture')}</p>
                    <p className="text-3xl font-bold text-gray-800">
                      {sensorData.soilMoisture !== null && sensorData.soilMoisture !== undefined ? `${sensorData.soilMoisture}%` : '--'}
                    </p>
                  </div>
                  <Sprout className="w-10 h-10 text-green-500" />
                </div>
              </Card>

              {/* Rain Sensor (Replaces pH sensor) */}
              <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-l-4 border-indigo-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('rainSensor')}</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {sensorData.rainLevel !== null && sensorData.rainLevel !== undefined
                        ? (sensorData.rainLevel > 0 ? `🌧️ ${t('rainDetected')}` : `☀️ ${t('noRain')}`)
                        : '--'}
                    </p>
                  </div>
                  <CloudRain className="w-10 h-10 text-indigo-500" />
                </div>
              </Card>
            </div>

            {/* NPK Soil Nutrients Section (Three Separate Cards) */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  🧪 {t('npkNutrients')}
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    RS485 NPK Sensor
                  </span>
                </h3>
                <span className="text-xs text-gray-500 font-medium">Unit: mg/kg</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Nitrogen (N) Card */}
                <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-l-4 border-amber-500 shadow-sm hover:shadow transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold font-mono">N</span>
                        <p className="text-sm text-gray-700 font-semibold">{t('nitrogen')}</p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {sensorData.nitrogen !== null && sensorData.nitrogen !== undefined ? (
                          <>
                            {sensorData.nitrogen} <span className="text-sm font-normal text-gray-500">mg/kg</span>
                          </>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                        {sensorData.nitrogen !== null && sensorData.nitrogen !== undefined ? (
                          sensorData.nitrogen < 20 ? (
                            <span className="text-amber-700 font-medium">⚠️ {t('low')} ({t('sufficient')}: 20-50 mg/kg)</span>
                          ) : sensorData.nitrogen > 80 ? (
                            <span className="text-blue-700 font-medium">🔷 {t('high')}</span>
                          ) : (
                            <span className="text-emerald-700 font-medium">✅ {t('optimal')}</span>
                          )
                        ) : (
                          <span className="text-gray-400 italic">{t('waitingForSensorData')}</span>
                        )}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center font-bold text-xl shadow-inner">
                      N
                    </div>
                  </div>
                </Card>

                {/* Phosphorus (P) Card */}
                <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-l-4 border-indigo-500 shadow-sm hover:shadow transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-bold font-mono">P</span>
                        <p className="text-sm text-gray-700 font-semibold">{t('phosphorus')}</p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {sensorData.phosphorus !== null && sensorData.phosphorus !== undefined ? (
                          <>
                            {sensorData.phosphorus} <span className="text-sm font-normal text-gray-500">mg/kg</span>
                          </>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                        {sensorData.phosphorus !== null && sensorData.phosphorus !== undefined ? (
                          sensorData.phosphorus < 15 ? (
                            <span className="text-amber-700 font-medium">⚠️ {t('low')} ({t('sufficient')}: 15-40 mg/kg)</span>
                          ) : sensorData.phosphorus > 60 ? (
                            <span className="text-blue-700 font-medium">🔷 {t('high')}</span>
                          ) : (
                            <span className="text-emerald-700 font-medium">✅ {t('optimal')}</span>
                          )
                        ) : (
                          <span className="text-gray-400 italic">{t('waitingForSensorData')}</span>
                        )}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center font-bold text-xl shadow-inner">
                      P
                    </div>
                  </div>
                </Card>

                {/* Potassium (K) Card */}
                <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-l-4 border-teal-500 shadow-sm hover:shadow transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs font-bold font-mono">K</span>
                        <p className="text-sm text-gray-700 font-semibold">{t('potassium')}</p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {sensorData.potassium !== null && sensorData.potassium !== undefined ? (
                          <>
                            {sensorData.potassium} <span className="text-sm font-normal text-gray-500">mg/kg</span>
                          </>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                        {sensorData.potassium !== null && sensorData.potassium !== undefined ? (
                          sensorData.potassium < 50 ? (
                            <span className="text-amber-700 font-medium">⚠️ {t('low')} ({t('sufficient')}: 50-150 mg/kg)</span>
                          ) : sensorData.potassium > 200 ? (
                            <span className="text-blue-700 font-medium">🔷 {t('high')}</span>
                          ) : (
                            <span className="text-emerald-700 font-medium">✅ {t('optimal')}</span>
                          )
                        ) : (
                          <span className="text-gray-400 italic">{t('waitingForSensorData')}</span>
                        )}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-teal-100/80 text-teal-700 flex items-center justify-center font-bold text-xl shadow-inner">
                      K
                    </div>
                  </div>
                </Card>
              </div>
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