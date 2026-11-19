import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { Sprout, TrendingUp, AlertTriangle, CheckCircle, Info, Lock, Unlock } from 'lucide-react';
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
  const [showUnlockConfirmation, setShowUnlockConfirmation] = useState(false);
  const [soilPH, setSoilPH] = useState(6.5);

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
      setInitialLoading(true);
      const response = await api.get('/sensors/latest');
      console.log('Crop Recommendation - Sensor data:', response.data);
      
      // Handle direct data (no nesting)
      const data = response.data;
      
      if (data && data.temperature !== undefined) {
        setSensorData(data);
        console.log('✅ Using live sensor data for prediction');
      }
    } catch (error) {
      console.error('Sensor data error:', error);
      toast.error('Could not fetch sensor data');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchFields = async () => {
    try {
      const response = await api.get('/fields');
      setFields(response.data);
      if (response.data.length > 0 && !selectedField) {
        setSelectedField(response.data[0]._id);
      }
    } catch (error) {
      console.error('Fields error:', error);
      toast.error('Could not fetch fields');
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
        pH: parseFloat(soilPH) || 6.5,
        rainfall: parseFloat(sensorData.rainfall) || 100,
        fieldId: selectedField,
        useAggregated: true
      };
      
      console.log('Sending crop recommendation request:', payload);
      
      const response = await api.post('/predict/crop', payload);
      
      if (response.data) {
        if (response.data.recommendationDisabled) {
          // Field has a locked crop
          toast.success(`Crop is locked: ${response.data.lockedCrop}`);
        } else {
          setRecommendation(response.data);
          toast.success('Market-aware recommendation generated!');
        }
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
      
      // Save to crop plans collection
      const planResponse = await api.post('/crop-plans', {
        fieldId: selectedField,
        selectedCrop: crop.name || crop,
        season: getCurrentSeason()
      });
      
      // Lock the crop for the field
      const lockResponse = await api.post(`/predict/lock-crop/${selectedField}`, {
        selectedCrop: crop.name || crop
      });
      
      if (planResponse.data && lockResponse.data) {
        toast.success('Crop plan saved and locked successfully!');
        // Refresh fields to show the locked crop
        fetchFields();
        setRecommendation(null);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.error || 'Failed to save crop plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 6 && month <= 10) return 'kharif';
    if (month >= 10 || month <= 3) return 'rabi';
    return 'zaid';
  };

  const handleUnlockCrop = async () => {
    if (!selectedField) {
      toast.error('Please select a field first');
      return;
    }
    
    try {
      const response = await api.post(`/predict/unlock-crop/${selectedField}`);
      if (response.data) {
        toast.success(response.data.message);
        // Refresh fields and reset recommendation
        fetchFields();
        setRecommendation(null);
        setShowUnlockConfirmation(false);
      }
    } catch (error) {
      console.error('Unlock error:', error);
      toast.error(error.response?.data?.error || 'Failed to unlock crop');
    }
  };

  const getSelectedFieldData = () => {
    return fields.find(field => field._id === selectedField);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Crop Recommendation</h1>
          <p className="text-gray-600">Get market-aware crop suggestions based on your field conditions</p>
        </div>

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
                  
                  {/* Display locked crop info if exists */}
                  {selectedField && getSelectedFieldData()?.isCropLocked && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-blue-800">Locked Crop</span>
                          </div>
                          <p className="text-lg font-bold text-blue-600 mt-1">
                            {getSelectedFieldData().lockedCrop}
                          </p>
                          <p className="text-sm text-blue-600">
                            Locked on: {new Date(getSelectedFieldData().cropLockDate).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowUnlockConfirmation(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                          <Unlock className="w-4 h-4" />
                          Change Crop
                        </button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-sm text-blue-700">
                          ✅ <strong>Live monitoring active:</strong> Sensor data is being tracked for irrigation and advisory purposes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sensor Data Display */}
              {sensorData && (
                <div className="mb-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                      <p className="text-sm text-gray-600">Temperature</p>
                      <p className="text-xl font-bold text-gray-800">{sensorData.temperature !== null ? `${sensorData.temperature}°C` : '--'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                      <p className="text-sm text-gray-600">Humidity</p>
                      <p className="text-xl font-bold text-gray-800">{sensorData.humidity !== null ? `${sensorData.humidity}%` : '--'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                      <p className="text-sm text-gray-600">Soil Moisture</p>
                      <p className="text-xl font-bold text-gray-800">{sensorData.soilMoisture !== null ? `${sensorData.soilMoisture}%` : '--'}</p>
                    </div>
                  </div>

                  {/* Soil Science Input: Soil pH for ML model */}
                  <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-purple-900">
                        🧪 Soil Test pH (Agronomic ML Parameter)
                      </p>
                      <p className="text-xs text-purple-700 mt-0.5">
                        Input from your Soil Health Card / Lab test. Defaults to regional baseline (6.5).
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <input
                        type="number"
                        step="0.1"
                        min="3.5"
                        max="9.5"
                        value={soilPH}
                        onChange={(e) => setSoilPH(parseFloat(e.target.value) || 6.5)}
                        className="w-20 px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg text-sm font-bold text-purple-900 text-center focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <span className="text-xs font-bold text-purple-700">pH</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={getRecommendation}
                disabled={loading || !sensorData || (selectedField && getSelectedFieldData()?.isCropLocked)}
                className={`w-full px-6 py-3 text-white rounded-lg font-semibold transition-colors ${
                  loading || !sensorData || (selectedField && getSelectedFieldData()?.isCropLocked)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Analyzing...
                  </span>
                ) : selectedField && getSelectedFieldData()?.isCropLocked ? (
                  <span className="flex items-center justify-center gap-2">
                    <Lock className="w-5 h-5" />
                    Crop Locked - Click "Change Crop" to Unlock
                  </span>
                ) : (
                  'Get Market-Aware Recommendation'
                )}
              </button>
            </Card>

            {/* Unlock Confirmation Dialog */}
            {showUnlockConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <Card className="max-w-md w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <Unlock className="w-8 h-8 text-yellow-600" />
                    <h3 className="text-xl font-bold text-gray-800">Change Crop / Start New Season</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to change the crop for this field? This will unlock crop prediction for the next season.
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUnlockConfirmation(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUnlockCrop}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      Confirm
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {/* Recommendation Results */}
            {recommendation && !recommendation.recommendationDisabled && (
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
                        <p className="text-sm text-blue-700">
                          <strong>ML Model:</strong> {recommendation.mlModel}
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => saveCropPlan(recommendation.recommendedCrop)}
                      disabled={savingPlan}
                      className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                    >
                      {savingPlan ? 'Locking Crop...' : `Lock "${recommendation.recommendedCrop}" for this Field`}
                    </button>
                  </div>
                </Card>

                {/* Alternative Crops */}
                <Card>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Alternative Suitable Crops</h3>
                  
                  <div className="space-y-4">
                    {recommendation.suitableCrops.map((crop, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-800">{crop.name}</h4>
                              {crop.supply_status && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  crop.supply_status.includes('Oversupply') 
                                    ? 'bg-red-100 text-red-700' 
                                    : crop.supply_status.includes('Opportunity')
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-blue-100 text-blue-700'
                                }`}>
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
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