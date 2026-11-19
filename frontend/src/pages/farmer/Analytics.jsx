import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Sprout, Activity, CloudRain } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState([]);
  const [stats, setStats] = useState(null);
  const [timeRange, setTimeRange] = useState(24);
  const [latestReading, setLatestReading] = useState(null);
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [realtimeData, setRealtimeData] = useState([]);

  useEffect(() => {
    // ALWAYS load data from MongoDB on mount and time range change
    fetchSensorHistory();
    fetchLatestReading();
    
    // Setup real-time sensor updates
    const socket = getSocket();
    if (socket) {
      // Listen for live sensor updates
      socket.on('sensorUpdate', (data) => {
        console.log('Live sensor update received:', data);
        setLatestReading(data);
        setEsp32Connected(true);
        
        // If in real-time mode, add new data to existing array
        if (isRealTimeMode) {
          setRealtimeData(prev => {
            const newData = [...prev, data];
            // Keep only last 50 readings for real-time view
            return newData.slice(-50);
          });
        } else {
          // In historical mode, refresh data from MongoDB periodically
          // This ensures graphs always show latest stored data
          fetchSensorHistory();
        }
      });
      
      // Check ESP32 connection status
      socket.on('esp32Connected', () => {
        setEsp32Connected(true);
      });
      
      socket.on('esp32Disconnected', () => {
        setEsp32Connected(false);
      });
    }
    
    return () => {
      if (socket) {
        socket.off('sensorUpdate');
        socket.off('esp32Connected');
        socket.off('esp32Disconnected');
      }
    };
  }, [timeRange, isRealTimeMode]);

  const fetchLatestReading = async () => {
    try {
      const response = await api.get('/sensors/latest');
      console.log('Analytics - Latest reading:', response.data);
      
      // Handle direct data (no nesting)
      const data = response.data;
      
      if (data && data.temperature !== undefined) {
        setLatestReading(data);
        setEsp32Connected(true);
        console.log('✅ Latest reading loaded for analytics');
      }
    } catch (error) {
      console.error('Failed to fetch latest reading:', error);
    }
  };

  const fetchSensorHistory = async () => {
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        api.get(`/sensors/history?hours=${timeRange}`),
        api.get(`/sensors/stats?hours=${timeRange}`)
      ]);

      setSensorData(historyRes.data.data);
      setStats(statsRes.data.stats);
    } catch (error) {
      toast.error('Failed to fetch sensor history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = () => {
    const dataSource = isRealTimeMode ? realtimeData : sensorData;
    return dataSource.map(reading => ({
      time: new Date(reading.timestamp).toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: isRealTimeMode ? '2-digit' : undefined,
        hour12: false 
      }),
      temperature: reading.temperature,
      humidity: reading.humidity,
      soilMoisture: reading.soilMoisture,
      nitrogen: reading.nitrogen !== undefined ? reading.nitrogen : 0,
      phosphorus: reading.phosphorus !== undefined ? reading.phosphorus : 0,
      potassium: reading.potassium !== undefined ? reading.potassium : 0
    }));
  };

  const handleTimeRangeChange = (hours) => {
    setTimeRange(hours);
    setIsRealTimeMode(false);
    setRealtimeData([]);
  };

  const handleRealTimeMode = async () => {
    setIsRealTimeMode(true);
    
    // Load last 50 readings from MongoDB for real-time mode
    // This ensures data persists on page refresh
    try {
      const response = await api.get('/sensors/history?hours=1&limit=50');
      const last50 = response.data.data || [];
      setRealtimeData(last50);
      console.log('✅ Loaded last 50 readings from MongoDB for real-time mode');
    } catch (error) {
      console.error('Failed to load real-time data:', error);
      // Fallback: use latest reading if available
      if (latestReading) {
        setRealtimeData([latestReading]);
      } else {
        setRealtimeData([]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            Sensor Analytics Dashboard
            <span className="text-sm font-normal px-3 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-2">
              <Activity className="w-4 h-4 animate-pulse" />
              Live
            </span>
          </h1>
          <p className="text-gray-600">Real-time monitoring and historical sensor data analysis</p>
        </div>

        {/* Live Sensor Data Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Activity className="w-6 h-6 text-green-600 animate-pulse" />
                Live Sensor Data
              </h2>
              <p className="text-sm text-gray-600 mt-1">Real-time readings from your field sensors</p>
            </div>
            {esp32Connected && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-700">ESP32 Connected</span>
              </div>
            )}
            {!esp32Connected && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-600">Waiting for data...</span>
              </div>
            )}
          </div>

          {latestReading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Temperature */}
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-l-4 border-red-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Thermometer className="w-10 h-10 text-red-600" />
                  <div className="text-right">
                    <div className="text-3xl font-bold text-red-600">
                      {latestReading.temperature?.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">°C</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">Temperature</div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
                    style={{ width: `${Math.min((latestReading.temperature / 50) * 100, 100)}%` }}
                  ></div>
                </div>
              </Card>

              {/* Humidity */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Droplets className="w-10 h-10 text-blue-600" />
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">
                      {latestReading.humidity?.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">%</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">Humidity</div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                    style={{ width: `${latestReading.humidity}%` }}
                  ></div>
                </div>
              </Card>

              {/* Soil Moisture */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Sprout className="w-10 h-10 text-green-600" />
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">
                      {latestReading.soilMoisture?.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">%</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">Soil Moisture</div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                    style={{ width: `${latestReading.soilMoisture}%` }}
                  ></div>
                </div>
              </Card>

              {/* NPK Soil Nutrients */}
              <Card className="bg-gradient-to-br from-amber-50 to-emerald-50 border-l-4 border-amber-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Sprout className="w-10 h-10 text-amber-600" />
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-800 font-mono">
                      N:{latestReading.nitrogen ?? 0} P:{latestReading.phosphorus ?? 0} K:{latestReading.potassium ?? 0}
                    </div>
                    <div className="text-sm text-gray-600">mg/kg</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">NPK Soil Nutrients</div>
                <div className="mt-2 text-xs text-gray-500">
                  Real-time RS485 NPK Sensor
                </div>
              </Card>

              {/* Rainfall (if available) */}
              <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-l-4 border-indigo-500 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <CloudRain className="w-10 h-10 text-indigo-600" />
                  <div className="text-right">
                    <div className="text-3xl font-bold text-indigo-600">
                      {latestReading.rainfall ? latestReading.rainfall.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-sm text-gray-600">mm</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">Rainfall</div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500"
                    style={{ width: `${Math.min((latestReading.rainfall || 0) / 100 * 100, 100)}%` }}
                  ></div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-600 font-semibold">Waiting for sensor data...</p>
                <p className="text-sm text-gray-500 mt-2">Make sure your ESP32 sensors are connected</p>
              </div>
            </Card>
          )}

          {/* Last Update Time */}
          {latestReading && (
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-600">
                Last updated: <span className="font-semibold">
                  {new Date(latestReading.timestamp).toLocaleString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Time Range Selector */}
        <Card className="mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="font-semibold text-gray-700">Time Range:</label>
            
            {/* Real-time Button */}
            <button
              onClick={handleRealTimeMode}
              className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                isRealTimeMode
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Activity className={`w-4 h-4 ${isRealTimeMode ? 'animate-pulse' : ''}`} />
              Real-time
            </button>
            
            {/* Historical Time Ranges */}
            {[6, 12, 24, 48, 168].map(hours => (
              <button
                key={hours}
                onClick={() => handleTimeRangeChange(hours)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  !isRealTimeMode && timeRange === hours
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {hours < 24 ? `${hours}h` : `${hours / 24}d`}
              </button>
            ))}
          </div>
          
          {isRealTimeMode && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <Activity className="w-4 h-4 animate-pulse" />
                <strong>Real-time mode active:</strong> Charts will update automatically as new sensor data arrives (showing last 50 readings)
              </p>
            </div>
          )}
        </Card>

        {loading ? (
          <Loading message="Loading sensor analytics..." />
        ) : (
          <>
            {/* Statistics Cards */}
            {stats && !isRealTimeMode && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-red-50 to-orange-50">
                  <div className="flex items-center gap-3 mb-3">
                    <Thermometer className="w-8 h-8 text-red-600" />
                    <h3 className="font-bold text-gray-800">Temperature</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">Avg: <span className="font-bold">{stats.avgTemp?.toFixed(1)}°C</span></p>
                    <p className="text-gray-600">Max: <span className="font-bold text-red-600">{stats.maxTemp?.toFixed(1)}°C</span></p>
                    <p className="text-gray-600">Min: <span className="font-bold text-blue-600">{stats.minTemp?.toFixed(1)}°C</span></p>
                  </div>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
                  <div className="flex items-center gap-3 mb-3">
                    <Droplets className="w-8 h-8 text-blue-600" />
                    <h3 className="font-bold text-gray-800">Humidity</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">Avg: <span className="font-bold">{stats.avgHumidity?.toFixed(1)}%</span></p>
                    <p className="text-gray-600">Max: <span className="font-bold text-blue-600">{stats.maxHumidity?.toFixed(1)}%</span></p>
                    <p className="text-gray-600">Min: <span className="font-bold">{stats.minHumidity?.toFixed(1)}%</span></p>
                  </div>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="flex items-center gap-3 mb-3">
                    <Sprout className="w-8 h-8 text-green-600" />
                    <h3 className="font-bold text-gray-800">Soil Moisture</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">Avg: <span className="font-bold">{stats.avgSoilMoisture?.toFixed(1)}%</span></p>
                    <p className="text-gray-600">Max: <span className="font-bold text-green-600">{stats.maxSoilMoisture?.toFixed(1)}%</span></p>
                    <p className="text-gray-600">Min: <span className="font-bold text-red-600">{stats.minSoilMoisture?.toFixed(1)}%</span></p>
                  </div>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-yellow-50">
                  <div className="flex items-center gap-3 mb-3">
                    <Sprout className="w-8 h-8 text-amber-600" />
                    <h3 className="font-bold text-gray-800">NPK Nutrients</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">N: <span className="font-bold">{sensorData[sensorData.length - 1]?.nitrogen ?? '--'} mg/kg</span></p>
                    <p className="text-gray-600">P: <span className="font-bold">{sensorData[sensorData.length - 1]?.phosphorus ?? '--'} mg/kg</span></p>
                    <p className="text-gray-600">K: <span className="font-bold">{sensorData[sensorData.length - 1]?.potassium ?? '--'} mg/kg</span></p>
                  </div>
                </Card>
              </div>
            )}
            
            {/* Real-time Statistics */}
            {isRealTimeMode && realtimeData.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600 animate-pulse" />
                  Real-time Statistics (Last {realtimeData.length} readings)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-red-50 to-orange-50">
                    <div className="flex items-center gap-3 mb-3">
                      <Thermometer className="w-8 h-8 text-red-600" />
                      <h3 className="font-bold text-gray-800">Temperature</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Current: <span className="font-bold text-2xl text-red-600">{realtimeData[realtimeData.length - 1].temperature?.toFixed(1)}°C</span></p>
                      <p className="text-gray-600">Avg: <span className="font-bold">{(realtimeData.reduce((sum, r) => sum + r.temperature, 0) / realtimeData.length).toFixed(1)}°C</span></p>
                    </div>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
                    <div className="flex items-center gap-3 mb-3">
                      <Droplets className="w-8 h-8 text-blue-600" />
                      <h3 className="font-bold text-gray-800">Humidity</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Current: <span className="font-bold text-2xl text-blue-600">{realtimeData[realtimeData.length - 1].humidity?.toFixed(1)}%</span></p>
                      <p className="text-gray-600">Avg: <span className="font-bold">{(realtimeData.reduce((sum, r) => sum + r.humidity, 0) / realtimeData.length).toFixed(1)}%</span></p>
                    </div>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                    <div className="flex items-center gap-3 mb-3">
                      <Sprout className="w-8 h-8 text-green-600" />
                      <h3 className="font-bold text-gray-800">Soil Moisture</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Current: <span className="font-bold text-2xl text-green-600">{realtimeData[realtimeData.length - 1].soilMoisture?.toFixed(1)}%</span></p>
                      <p className="text-gray-600">Avg: <span className="font-bold">{(realtimeData.reduce((sum, r) => sum + r.soilMoisture, 0) / realtimeData.length).toFixed(1)}%</span></p>
                    </div>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-50 to-yellow-50">
                    <div className="flex items-center gap-3 mb-3">
                      <Sprout className="w-8 h-8 text-amber-600" />
                      <h3 className="font-bold text-gray-800">NPK Status</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">N: <span className="font-bold text-amber-600">{realtimeData[realtimeData.length - 1]?.nitrogen ?? 0} mg/kg</span></p>
                      <p className="text-gray-600">P: <span className="font-bold text-indigo-600">{realtimeData[realtimeData.length - 1]?.phosphorus ?? 0} mg/kg</span></p>
                      <p className="text-gray-600">K: <span className="font-bold text-teal-600">{realtimeData[realtimeData.length - 1]?.potassium ?? 0} mg/kg</span></p>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            
            {/* No data message for real-time mode */}
            {isRealTimeMode && realtimeData.length === 0 && (
              <Card className="mb-6">
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Waiting for real-time data...</h3>
                  <p className="text-gray-600">Charts will appear as sensor data arrives</p>
                  <p className="text-sm text-gray-500 mt-2">Make sure your ESP32 sensors are connected and sending data</p>
                </div>
              </Card>
            )}

            {/* Temperature & Humidity Chart */}
            {(!isRealTimeMode || realtimeData.length > 0) && (
            <Card className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Temperature & Humidity Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formatChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Temperature (°C)"
                    dot={false}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Humidity (%)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            )}

            {/* Soil Moisture Chart */}
            {(!isRealTimeMode || realtimeData.length > 0) && (
            <Card className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Soil Moisture Levels</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={formatChartData()}>
                  <defs>
                    <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="soilMoisture" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorMoisture)"
                    name="Soil Moisture (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            )}

            {/* NPK Soil Nutrients Chart */}
            {(!isRealTimeMode || realtimeData.length > 0) && (
            <Card className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">🧪 NPK Soil Nutrients (mg/kg)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="nitrogen" fill="#f59e0b" name="Nitrogen (N)" />
                  <Bar dataKey="phosphorus" fill="#6366f1" name="Phosphorus (P)" />
                  <Bar dataKey="potassium" fill="#14b8a6" name="Potassium (K)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            )}

            {/* All Parameters Combined */}
            {(!isRealTimeMode || realtimeData.length > 0) && (
            <Card>
              <h3 className="text-xl font-bold text-gray-800 mb-4">All Parameters Overview</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={formatChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#ef4444" 
                    name="Temperature (°C)"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#3b82f6" 
                    name="Humidity (%)"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="soilMoisture" 
                    stroke="#22c55e" 
                    name="Soil Moisture (%)"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="nitrogen" 
                    stroke="#f59e0b" 
                    name="Nitrogen (mg/kg)"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="potassium" 
                    stroke="#14b8a6" 
                    name="Potassium (mg/kg)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
