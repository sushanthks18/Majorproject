import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { Activity, AlertTriangle, Thermometer, Droplets, Sprout, FlaskConical } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const DiseaseCheck = () => {
  const [sensorData, setSensorData] = useState(null);
  const [crop, setCrop] = useState('Rice');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [esp32Connected, setEsp32Connected] = useState(false);

  useEffect(() => {
    fetchSensorData();
    
    // Setup real-time sensor updates
    const socket = getSocket();
    if (socket) {
      socket.on('sensorUpdate', (data) => {
        console.log('Live sensor update received:', data);
        setSensorData(data);
        setEsp32Connected(true);
      });
      
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
  }, []);

  const fetchSensorData = async () => {
    try {
      const response = await api.get('/sensors/latest');
      console.log('Disease Check - Sensor data:', response.data);
      
      // Handle direct data (no nesting)
      const data = response.data;
      
      if (data && data.temperature !== undefined) {
        setSensorData(data);
        setEsp32Connected(true);
        console.log('✅ Sensor data loaded for disease check');
      }
    } catch (error) {
      console.error('Failed to fetch sensor data:', error);
      toast.error('Failed to fetch sensor data');
    } finally {
      setLoading(false);
    }
  };

  const checkDisease = async () => {
    if (!sensorData) {
      toast.error('No sensor data available. Please wait for sensor readings.');
      return;
    }

    try {
      setLoading(true);
      const diseasePayload = {
        crop,
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        soilMoisture: sensorData.soilMoisture,
        pH: sensorData.pH
      };
      
      console.log('Disease Check Payload:', diseasePayload);
      const response = await api.post('/predict/disease', diseasePayload);
      setPrediction(response.data);
      toast.success('Disease risk assessed!');
    } catch (error) {
      console.error('Disease check error:', error);
      toast.error('Failed to check disease risk');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    if (risk < 30) return 'text-green-600 bg-green-100';
    if (risk < 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">Disease Risk Prediction</h1>
            {esp32Connected && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-700">Live Data</span>
              </div>
            )}
          </div>
          <p className="text-gray-600 mt-2">Assess disease risk based on environmental conditions</p>
        </div>

        {loading ? <Loading /> : (
          <>
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Current Sensor Readings</h2>
                {sensorData && (
                  <span className="text-xs text-gray-500">
                    Updated: {new Date(sensorData.timestamp || sensorData.createdAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {sensorData ? (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border-l-4 border-red-500 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <Thermometer className="w-8 h-8 text-red-600" />
                      <div className="text-right">
                        <p className="text-3xl font-bold text-red-600">{sensorData.temperature?.toFixed(1) || 'N/A'}</p>
                        <p className="text-sm text-gray-600">°C</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700">Temperature</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <Droplets className="w-8 h-8 text-blue-600" />
                      <div className="text-right">
                        <p className="text-3xl font-bold text-blue-600">{sensorData.humidity?.toFixed(1) || 'N/A'}</p>
                        <p className="text-sm text-gray-600">%</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700">Humidity</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <Sprout className="w-8 h-8 text-green-600" />
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">{sensorData.soilMoisture?.toFixed(1) || 'N/A'}</p>
                        <p className="text-sm text-gray-600">%</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700">Soil Moisture</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <FlaskConical className="w-8 h-8 text-purple-600" />
                      <div className="text-right">
                        <p className="text-3xl font-bold text-purple-600">{sensorData.pH?.toFixed(1) || 'N/A'}</p>
                        <p className="text-sm text-gray-600">pH</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700">pH Level</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-gray-100 rounded-lg mb-6 text-center">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-gray-600 font-medium">Waiting for sensor data...</p>
                  <p className="text-sm text-gray-500 mt-2">Make sure your ESP32 sensors are connected</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Crop</label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {['Rice', 'Wheat', 'Cotton', 'Maize', 'Sugarcane', 'Tomato', 'Potato', 'Soybean'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={checkDisease}
                disabled={!sensorData}
                className={`w-full px-6 py-3 text-white rounded-lg font-semibold transition-colors ${
                  sensorData 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {sensorData ? 'Check Disease Risk' : 'Waiting for Sensor Data...'}
              </button>
            </Card>

            {prediction && (
              <Card>
                <div className="text-center mb-6">
                  <Activity className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Risk Assessment</h2>
                  <div className={`inline-block px-8 py-4 rounded-xl ${getRiskColor(prediction.riskLevel)}`}>
                    <p className="text-5xl font-bold">{prediction.riskLevel}%</p>
                  </div>
                  <p className="mt-4 font-semibold text-lg">{prediction.recommendation}</p>
                </div>

                {prediction.diseases.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Potential Issues
                    </h3>
                    <ul className="space-y-2">
                      {prediction.diseases.map((disease, idx) => (
                        <li key={idx} className="p-3 bg-yellow-50 rounded-lg text-yellow-800">
                          {disease}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-lg mb-3">Preventive Measures</h3>
                  <ul className="space-y-2">
                    {prediction.preventiveMeasures.map((measure, idx) => (
                      <li key={idx} className="p-3 bg-green-50 rounded-lg text-green-800 flex items-start gap-2">
                        <span className="font-bold">{idx + 1}.</span>
                        <span>{measure}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DiseaseCheck;
