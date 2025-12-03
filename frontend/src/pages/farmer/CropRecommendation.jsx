import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { Sprout, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const CropRecommendation = () => {
  const [sensorData, setSensorData] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    fetchSensorData();
    fetchFields();
    
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

  const fetchFields = async () => {
    try {
      const response = await api.get('/fields');
      if (response.data && response.data.fields) {
        setFields(response.data.fields);
        if (response.data.fields.length > 0) {
          setSelectedField(response.data.fields[0]._id);
        }
      }
    } catch (error) {
      console.error('Fields fetch error:', error);
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
        pH: parseFloat(sensorData.pH) || 6.5,
        fieldId: selectedField
      };
      
      console.log('Sending crop recommendation request:', payload);
      
      const response = await api.post('/predict/crop', payload);
      
      if (response.data) {
        setRecommendation(response.data);
        toast.success('Market-aware recommendation generated!');
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

  const saveCropPlan = async (crop) => {
    if (!selectedField) {
      toast.error('Please select a field first');
      return;
    }

    try {
      setSavingPlan(true);
      
      // Determine current season
      const currentMonth = new Date().getMonth();
      let season = 'year-round';
      if (currentMonth >= 6 && currentMonth <= 10) {
        season = 'kharif';
      } else if (currentMonth >= 10 || currentMonth <= 3) {
        season = 'rabi';
      } else {
        season = 'zaid';
      }

      const payload = {
        fieldId: selectedField,
        selectedCrop: crop.name,
        season,
        profitabilityScore: crop.profitability_score || crop.suitability_score
      };

      const response = await api.post('/crop-plans', payload);
      
      if (response.data) {
        toast.success(`${crop.name} added to your crop plan!`);
      }
    } catch (error) {
      console.error('Save crop plan error:', error);
      toast.error(error.response?.data?.error || 'Failed to save crop plan');
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Market-Aware Crop Recommendation</h1>
        <p className="text-gray-600 mb-8">Get diversified crop suggestions to avoid market oversupply</p>

        {initialLoading ? <Loading /> : (
          <>
            <Card className="mb-6">
              <h2 className="text-xl font-bold mb-4">Current Conditions</h2>
              
              {/* Field Selection */}
              {fields.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Field</label>
                  <select
                    value={selectedField || ''}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {fields.map(field => (
                      <option key={field._id} value={field._id}>
                        {field.name} ({field.areaHectares} hectares) - {field.district}, {field.taluk}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                    className="w-full mt-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? 'Analyzing Market & Soil...' : (
                      <>
                        <TrendingUp className="w-5 h-5" />
                        Get Market-Aware Recommendation
                      </>
                    )}
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
                {/* Regional Market Insights */}
                {recommendation.regionalInsights && (
                  <Card className="mb-6 border-l-4 border-yellow-500">
                    <div className="flex items-start gap-3">
                      <Info className="w-6 h-6 text-yellow-600 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">Regional Market Insights</h3>
                        
                        {recommendation.regionalInsights.diversification_needed && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                            <p className="text-yellow-800 font-semibold flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5" />
                              Diversification Recommended!
                            </p>
                            <p className="text-sm text-yellow-700 mt-1">
                              Some crops are oversupplied in your region. Consider alternatives for better prices.
                            </p>
                          </div>
                        )}

                        {recommendation.regionalInsights.oversupplied_crops.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-red-700 mb-1">⚠️ Oversupplied Crops:</p>
                            <div className="flex flex-wrap gap-2">
                              {recommendation.regionalInsights.oversupplied_crops.map((crop, idx) => (
                                <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                  {crop}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {recommendation.regionalInsights.opportunity_crops.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-green-700 mb-1">🌟 Market Opportunities:</p>
                            <div className="flex flex-wrap gap-2">
                              {recommendation.regionalInsights.opportunity_crops.map((crop, idx) => (
                                <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                  {crop}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="mb-6">
                  <div className="text-center mb-6">
                    <Sprout className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Top Recommended Crop</h2>
                    <p className="text-4xl font-bold text-green-600 mt-2">{recommendation.recommendedCrop}</p>
                    <div className="flex justify-center gap-4 mt-3">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Profitability Score</p>
                        <p className="text-2xl font-bold text-blue-600">{recommendation.profitabilityScore?.toFixed(1) || recommendation.suitabilityScore?.toFixed(1)}%</p>
                      </div>
                      {recommendation.suitabilityScore && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Soil Suitability</p>
                          <p className="text-2xl font-bold text-green-600">{recommendation.suitabilityScore.toFixed(1)}%</p>
                        </div>
                      )}
                    </div>
                    
                    {recommendation.mlModel && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800 mb-2">🤖 {recommendation.mlModel.algorithm}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                          <div>
                            <span className="font-semibold">Model Accuracy:</span> {recommendation.mlModel.accuracy?.toFixed(1)}%
                          </div>
                          <div>
                            <span className="font-semibold">Market Factors:</span> {recommendation.mlModel.marketFactorsApplied ? '✅ Applied' : '❌ Not Applied'}
                          </div>
                        </div>
                        {recommendation.mlModel.diversificationStrategy && (
                          <div className="mt-2 text-xs text-blue-700">
                            <span className="font-semibold">Diversification:</span> {recommendation.mlModel.diversificationStrategy}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-lg">Alternative Crop Options</h3>
                    <p className="text-sm text-gray-600">Diversify your farm to reduce market risk and maximize profitability</p>
                    
                    {recommendation.suitableCrops?.map((crop, idx) => (
                      <div key={idx} className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-lg">{crop.name}</span>
                              {crop.supply_status && (
                                <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                  {crop.supply_status}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span className="text-green-600 font-semibold">
                                Profitability: {crop.profitability_score?.toFixed(1) || crop.suitability_score?.toFixed(1)}%
                              </span>
                              {crop.suitability_score && (
                                <span className="text-blue-600">
                                  Suitability: {crop.suitability_score.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => saveCropPlan(crop)}
                            disabled={savingPlan}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                          >
                            {savingPlan ? 'Saving...' : 'Select'}
                          </button>
                        </div>

                        {crop.market_warning && (
                          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                            <p className="text-xs text-yellow-800">{crop.market_warning}</p>
                          </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-green-600 font-semibold flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" /> Pros:
                            </p>
                            <ul className="list-disc list-inside text-gray-600">
                              {crop.pros?.map((pro, i) => <li key={i}>{pro}</li>)}
                            </ul>
                          </div>
                          <div>
                            <p className="text-red-600 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" /> Cons:
                            </p>
                            <ul className="list-disc list-inside text-gray-600">
                              {crop.cons?.map((con, i) => <li key={i}>{con}</li>)}
                            </ul>
                          </div>
                        </div>

                        {(crop.water_requirement || crop.market_volatility) && (
                          <div className="mt-3 pt-3 border-t border-gray-200 flex gap-4 text-xs text-gray-600">
                            {crop.water_requirement && (
                              <span>💧 Water: <strong>{crop.water_requirement}</strong></span>
                            )}
                            {crop.market_volatility && (
                              <span>📊 Market Risk: <strong>{crop.market_volatility}</strong></span>
                            )}
                          </div>
                        )}
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
