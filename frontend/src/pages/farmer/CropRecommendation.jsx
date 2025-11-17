import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { Sprout } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const CropRecommendation = () => {
  const [sensorData, setSensorData] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchSensorData();
    
    // Setup real-time sensor updates
    const socket = getSocket();
    if (socket) {
      socket.on('sensorUpdate', (data) => {
        setSensorData(data);
        console.log('Sensor data updated:', data);
      });
    }
    
    // Cleanup
    return () => {
      if (socket) {
        socket.off('sensorUpdate');
      }
    };
  }, []);

  const fetchSensorData = async () => {
    try {
      const response = await api.get('/sensors/latest');
      if (response.data && response.data.data) {
        setSensorData(response.data.data);
      }
    } catch (error) {
      console.error('Sensor data fetch error:', error);
      // Don't show error toast, data will come via socket
    } finally {
      setInitialLoading(false);
    }
  };

  const getRecommendation = async () => {
    if (!sensorData) {
      toast.error('Please wait for sensor data to load');
      return;
    }
    
    try {
      setLoading(true);
      const payload = {
        temperature: parseFloat(sensorData.temperature) || 25,
        humidity: parseFloat(sensorData.humidity) || 65,
        soilMoisture: parseFloat(sensorData.soilMoisture) || 50,
        pH: parseFloat(sensorData.pH) || 6.5
      };
      
      console.log('Sending crop recommendation request:', payload);
      
      const response = await api.post('/predict/crop', payload);
      
      if (response.data) {
        setRecommendation(response.data);
        toast.success('Recommendation generated!');
      } else {
        toast.error('No recommendation received');
      }
    } catch (error) {
      console.error('Recommendation error:', error);
      toast.error(error.response?.data?.error || 'Failed to get recommendation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Crop Recommendation</h1>

        {initialLoading ? <Loading /> : (
          <>
            <Card className="mb-6">
              <h2 className="text-xl font-bold mb-4">Current Conditions</h2>
              {sensorData ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Temperature</p>
                      <p className="text-2xl font-bold text-green-600">{sensorData.temperature}°C</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Humidity</p>
                      <p className="text-2xl font-bold text-blue-600">{sensorData.humidity}%</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Soil Moisture</p>
                      <p className="text-2xl font-bold text-green-600">{sensorData.soilMoisture}%</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">pH Level</p>
                      <p className="text-2xl font-bold text-purple-600">{sensorData.pH}</p>
                    </div>
                  </div>
                  <button
                    onClick={getRecommendation}
                    disabled={loading}
                    className="w-full mt-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Analyzing...' : 'Get Recommendation'}
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Waiting for sensor data...</p>
                  <p className="text-sm text-gray-400">Make sure your ESP32 is connected and sending data</p>
                </div>
              )}
            </Card>

            {recommendation && (
              <>
                <Card className="mb-6">
                  <div className="text-center mb-6">
                    <Sprout className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Recommended Crop</h2>
                    <p className="text-4xl font-bold text-green-600 mt-2">{recommendation.recommendedCrop}</p>
                    <p className="text-gray-600 mt-2">Confidence: {recommendation.confidence}%</p>
                    
                    {recommendation.mlModel && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800 mb-2">🤖 ML Model Prediction</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                          <div>
                            <span className="font-semibold">Algorithm:</span> {recommendation.mlModel.algorithm}
                          </div>
                          <div>
                            <span className="font-semibold">Model Accuracy:</span> {recommendation.mlModel.accuracy}%
                          </div>
                        </div>
                        {recommendation.mlModel.estimatedParams && (
                          <div className="mt-2 text-xs text-blue-700">
                            <span className="font-semibold">Estimated Nutrients:</span> N:{recommendation.mlModel.estimatedParams.nitrogen} | P:{recommendation.mlModel.estimatedParams.phosphorus} | K:{recommendation.mlModel.estimatedParams.potassium}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Other Suitable Crops</h3>
                    {recommendation.suitableCrops.map((crop, idx) => (
                      <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:border-green-500 transition">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-lg">{crop.name}</span>
                          <span className="text-green-600 font-semibold">{crop.confidence}%</span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-green-600 font-semibold">✅ Pros:</p>
                            <ul className="list-disc list-inside text-gray-600">
                              {crop.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="text-red-600 font-semibold">⚠️ Cons:</p>
                            <ul className="list-disc list-inside text-gray-600">
                              {crop.cons.map((con, i) => <li key={i}>{con}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CropRecommendation;
