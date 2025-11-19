import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { Activity, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const DiseaseCheck = () => {
  const [sensorData, setSensorData] = useState(null);
  const [crop, setCrop] = useState('Rice');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSensorData();
    
    // Setup real-time sensor updates
    const socket = getSocket();
    if (socket) {
      socket.on('sensorUpdate', (data) => {
        setSensorData(data);
      });
    }
    
    return () => {
      if (socket) {
        socket.off('sensorUpdate');
      }
    };
  }, []);

  const fetchSensorData = async () => {
    try {
      const response = await api.get('/sensors/latest');
      setSensorData(response.data.data);
    } catch (error) {
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
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Disease Risk Prediction</h1>

        {loading ? <Loading /> : (
          <>
            <Card className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Current Sensor Readings</h2>
              {sensorData ? (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Temperature</p>
                    <p className="text-2xl font-bold text-blue-600">{sensorData.temperature}°C</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Humidity</p>
                    <p className="text-2xl font-bold text-green-600">{sensorData.humidity}%</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">Soil Moisture</p>
                    <p className="text-2xl font-bold text-yellow-600">{sensorData.soilMoisture}%</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">pH Level</p>
                    <p className="text-2xl font-bold text-purple-600">{sensorData.pH}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-100 rounded-lg mb-6 text-center">
                  <p className="text-gray-600">Waiting for sensor data...</p>
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
