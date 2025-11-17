import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Sprout, FlaskConical } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState([]);
  const [stats, setStats] = useState(null);
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    fetchSensorHistory();
    
    // Setup real-time sensor updates - auto-refresh stats
    const socket = getSocket();
    if (socket) {
      socket.on('sensorUpdate', () => {
        fetchSensorHistory();
      });
    }
    
    return () => {
      if (socket) {
        socket.off('sensorUpdate');
      }
    };
  }, [timeRange]);

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
    return sensorData.map(reading => ({
      time: new Date(reading.timestamp).toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      temperature: reading.temperature,
      humidity: reading.humidity,
      soilMoisture: reading.soilMoisture,
      pH: reading.pH
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Sensor Analytics</h1>
          <p className="text-gray-600">View historical sensor data and trends</p>
        </div>

        {/* Time Range Selector */}
        <Card className="mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="font-semibold text-gray-700">Time Range:</label>
            {[6, 12, 24, 48, 168].map(hours => (
              <button
                key={hours}
                onClick={() => setTimeRange(hours)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  timeRange === hours
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {hours < 24 ? `${hours}h` : `${hours / 24}d`}
              </button>
            ))}
          </div>
        </Card>

        {loading ? (
          <Loading message="Loading sensor analytics..." />
        ) : (
          <>
            {/* Statistics Cards */}
            {stats && (
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

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
                  <div className="flex items-center gap-3 mb-3">
                    <FlaskConical className="w-8 h-8 text-purple-600" />
                    <h3 className="font-bold text-gray-800">pH Level</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">Avg: <span className="font-bold">{stats.avgPH?.toFixed(2)}</span></p>
                    <p className="text-gray-600">Max: <span className="font-bold">{stats.maxPH?.toFixed(2)}</span></p>
                    <p className="text-gray-600">Min: <span className="font-bold">{stats.minPH?.toFixed(2)}</span></p>
                  </div>
                </Card>
              </div>
            )}

            {/* Temperature & Humidity Chart */}
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

            {/* Soil Moisture Chart */}
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

            {/* pH Levels Chart */}
            <Card className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">pH Level Variations</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 14]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pH" fill="#a855f7" name="pH Level" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* All Parameters Combined */}
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
                    dataKey="pH" 
                    stroke="#a855f7" 
                    name="pH Level (x10)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
