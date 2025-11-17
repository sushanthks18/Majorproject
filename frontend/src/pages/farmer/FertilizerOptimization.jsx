import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sprout, TrendingDown, DollarSign, Loader, AlertTriangle, CheckCircle } from 'lucide-react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import api from '../../utils/api';
import toast from 'react-hot-toast';

function FertilizerOptimization() {
  const { fieldId } = useParams();
  const navigate = useNavigate();
  
  const [field, setField] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, [fieldId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const fieldsResponse = await api.get('/fields');
      const currentField = fieldsResponse.data.find(f => f._id === fieldId);
      
      if (!currentField) {
        toast.error('Field not found');
        navigate('/farmer/fields');
        return;
      }
      
      setField(currentField);

      try {
        const recsResponse = await api.get(`/irrigation/fertilizer/${fieldId}`);
        if (recsResponse.data.length > 0) {
          setRecommendation(recsResponse.data[0]);
        }
      } catch (error) {
        console.log('No fertilizer recommendation found');
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load field data');
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendation = async () => {
    try {
      setGenerating(true);
      toast.loading('Analyzing satellite imagery and nutrient levels...', { id: 'fertilizer' });
      
      const response = await api.post(`/irrigation/fertilizer/${fieldId}`);
      
      toast.success('Fertilizer optimization map generated!', { id: 'fertilizer' });
      setRecommendation(response.data.recommendation);
      
    } catch (error) {
      console.error('Error generating recommendation:', error);
      toast.error(error.response?.data?.error || 'Failed to generate recommendation', { id: 'fertilizer' });
    } finally {
      setGenerating(false);
    }
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      severe: 'bg-red-100 text-red-700',
      moderate: 'bg-orange-100 text-orange-700',
      mild: 'bg-yellow-100 text-yellow-700'
    };
    return badges[severity] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700'
    };
    return badges[priority] || 'bg-gray-100 text-gray-700';
  };

  const getNutrientIcon = (nutrient) => {
    const icons = {
      nitrogen: '🌿',
      phosphorus: '🌾',
      potassium: '🌻',
      'organic-matter': '🍂',
      micronutrients: '⚗️'
    };
    return icons[nutrient] || '🌱';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!field) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Field not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                <Sprout className="inline w-6 h-6 mr-2 text-green-600" />
                Fertilizer Optimization Map
              </h1>
              <p className="text-gray-600">{field.name} • {field.areaHectares} hectares</p>
            </div>
            
            <button
              onClick={generateRecommendation}
              disabled={generating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Sprout className="w-4 h-4" />
              {generating ? 'Analyzing...' : 'Generate Map'}
            </button>
          </div>
        </div>

        {recommendation ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Zone Analysis */}
            <div className="lg:col-span-2 space-y-6">
              {/* Savings Card */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-green-800 mb-2">💰 Cost Savings</h2>
                    <p className="text-3xl font-bold text-green-600">
                      ₹{recommendation.savings.comparedToUniform.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {recommendation.savings.optimizationPercentage}% savings vs uniform application
                    </p>
                  </div>
                  <TrendingDown className="w-16 h-16 text-green-600" />
                </div>
              </div>

              {/* Total Requirements */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Total NPK Requirements</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Nitrogen (N)</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {recommendation.totalRequirement.nitrogen.toFixed(1)} kg
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Phosphorus (P)</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {recommendation.totalRequirement.phosphorus.toFixed(1)} kg
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Potassium (K)</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {recommendation.totalRequirement.potassium.toFixed(1)} kg
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{recommendation.totalRequirement.totalCost.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Zone-wise Analysis */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Zone-wise Nutrient Analysis</h3>
                
                <div className="space-y-4">
                  {recommendation.nutrientZones.map((zone, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-lg p-4 hover:border-green-500 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{zone.zoneName}</h4>
                          <p className="text-sm text-gray-600">{zone.areaHectares} hectares</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(zone.priority)}`}>
                            {zone.priority} priority
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Estimated Cost</p>
                          <p className="text-2xl font-bold text-green-600">₹{zone.estimatedCost}</p>
                        </div>
                      </div>

                      {/* Deficiencies */}
                      {zone.deficiencies.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Detected Deficiencies:</p>
                          <div className="flex flex-wrap gap-2">
                            {zone.deficiencies.map((def, idx) => (
                              <div key={idx} className={`flex items-center gap-2 px-3 py-1 rounded-lg ${getSeverityBadge(def.severity)}`}>
                                <span>{getNutrientIcon(def.nutrient)}</span>
                                <span className="text-sm font-medium capitalize">{def.nutrient}</span>
                                <span className="text-xs">({def.severity})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* NPK Recommendation */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Recommended Application:</p>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">N</p>
                            <p className="font-bold text-blue-600">{zone.npkRecommendation.nitrogen} kg/ha</p>
                          </div>
                          <div>
                            <p className="text-gray-600">P</p>
                            <p className="font-bold text-purple-600">{zone.npkRecommendation.phosphorus} kg/ha</p>
                          </div>
                          <div>
                            <p className="text-gray-600">K</p>
                            <p className="font-bold text-orange-600">{zone.npkRecommendation.potassium} kg/ha</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Total for zone: {zone.npkRecommendation.totalPerZone} kg
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Method: {zone.applicationMethod}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Field Health</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Overall Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-600 h-3 rounded-full"
                          style={{ width: `${recommendation.overallHealthScore}%` }}
                        ></div>
                      </div>
                      <span className="text-lg font-bold">{Math.round(recommendation.overallHealthScore)}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Average NDVI</p>
                    <p className="text-2xl font-bold text-green-600">{recommendation.averageNDVI.toFixed(3)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Analysis Date</p>
                    <p className="font-semibold text-sm">{new Date(recommendation.analysisDate).toLocaleDateString()}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Recommended Date</p>
                    <p className="font-semibold text-sm">{new Date(recommendation.recommendedDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Optimized Cost</span>
                    <span className="font-bold text-green-600">₹{recommendation.totalRequirement.totalCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-gray-600">Uniform Cost</span>
                    <span className="font-bold text-gray-600">
                      ₹{(recommendation.totalRequirement.totalCost + recommendation.savings.comparedToUniform).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-semibold text-green-700">You Save</span>
                    <span className="font-bold text-green-700 text-lg">₹{recommendation.savings.comparedToUniform.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Benefits</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Zone-specific application reduces waste</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Optimal nutrient levels for each area</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Reduced environmental impact</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>Better crop yield potential</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Sprout className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Fertilizer Analysis</h3>
            <p className="text-gray-600 mb-6">
              Click "Generate Map" to analyze satellite imagery and get zone-wise NPK recommendations
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FertilizerOptimization;
