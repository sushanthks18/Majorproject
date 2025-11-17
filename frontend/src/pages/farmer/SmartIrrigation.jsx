import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Droplets, AlertTriangle, CheckCircle, Clock, TrendingDown, Loader, CloudRain, Wind, Thermometer } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import api from '../../utils/api';
import toast from 'react-hot-toast';

function SmartIrrigation() {
  const { fieldId } = useParams();
  const navigate = useNavigate();
  
  const [field, setField] = useState(null);
  const [schedule, setSchedule] = useState(null);
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
        const schedulesResponse = await api.get(`/irrigation/schedules/${fieldId}`);
        if (schedulesResponse.data.length > 0) {
          setSchedule(schedulesResponse.data[0]);
        }
      } catch (error) {
        console.log('No irrigation schedule found');
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load field data');
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = async () => {
    try {
      setGenerating(true);
      toast.loading('Analyzing field data and weather...', { id: 'schedule' });
      
      const response = await api.post(`/irrigation/schedule/${fieldId}`);
      
      toast.success('Irrigation schedule generated!', { id: 'schedule' });
      setSchedule(response.data.schedule);
      
    } catch (error) {
      console.error('Error generating schedule:', error);
      toast.error(error.response?.data?.error || 'Failed to generate schedule', { id: 'schedule' });
    } finally {
      setGenerating(false);
    }
  };

  const getStressColor = (level) => {
    const colors = {
      critical: 'bg-red-500',
      moderate: 'bg-orange-500',
      low: 'bg-yellow-500',
      optimal: 'bg-green-500'
    };
    return colors[level] || 'bg-gray-500';
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
                <Droplets className="inline w-6 h-6 mr-2 text-blue-600" />
                Smart Irrigation Scheduler
              </h1>
              <p className="text-gray-600">{field.name} • {field.areaHectares} hectares</p>
            </div>
            
            <button
              onClick={generateSchedule}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Droplets className="w-4 h-4" />
              {generating ? 'Analyzing...' : 'Generate Schedule'}
            </button>
          </div>
        </div>

        {schedule ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: AI Recommendation */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI Decision */}
              <div className={`rounded-lg shadow-md p-6 ${
                schedule.recommendation.shouldIrrigate 
                  ? 'bg-blue-50 border-2 border-blue-500' 
                  : 'bg-amber-50 border-2 border-amber-500'
              }`}>
                <div className="flex items-start gap-4">
                  {schedule.recommendation.shouldIrrigate ? (
                    <Droplets className="w-12 h-12 text-blue-600" />
                  ) : (
                    <CloudRain className="w-12 h-12 text-amber-600" />
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-2">
                      {schedule.recommendation.shouldIrrigate ? 'Irrigation Recommended' : 'Hold Irrigation'}
                    </h2>
                    <p className="text-lg mb-4">{schedule.recommendation.reason}</p>
                    
                    {schedule.recommendation.shouldIrrigate && (
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm text-gray-600">Total Water</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {(schedule.recommendation.totalWaterNeeded / 1000).toFixed(1)}k L
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm text-gray-600">Duration</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {schedule.recommendation.estimatedDuration} min
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm text-gray-600">Cost</p>
                          <p className="text-2xl font-bold text-green-600">
                            ₹{schedule.recommendation.costEstimate}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weather Info */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Weather Forecast</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <CloudRain className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Rain Probability</p>
                      <p className="text-lg font-bold">{schedule.weatherForecast.rainProbability}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Thermometer className="w-8 h-8 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">Temperature</p>
                      <p className="text-lg font-bold">{schedule.weatherForecast.temperature.toFixed(1)}°C</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Droplets className="w-8 h-8 text-cyan-600" />
                    <div>
                      <p className="text-sm text-gray-600">Humidity</p>
                      <p className="text-lg font-bold">{schedule.weatherForecast.humidity.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Wind className="w-8 h-8 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Wind Speed</p>
                      <p className="text-lg font-bold">{schedule.weatherForecast.windSpeed.toFixed(1)} km/h</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Water Stress Heatmap */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Water Stress Heatmap</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {schedule.zones.map((zone, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{zone.zoneName}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(zone.priority)}`}>
                            {zone.priority} priority
                          </span>
                        </div>
                        <div className={`w-4 h-4 rounded-full ${getStressColor(zone.waterStressLevel)}`}></div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Soil Moisture:</span>
                          <span className="font-semibold">{zone.soilMoisture}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Water Needed:</span>
                          <span className="font-semibold">{zone.waterRequired} L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-semibold">{zone.irrigationDuration} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ET Rate:</span>
                          <span className="font-semibold">{zone.evapotranspiration} mm/day</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Schedule Summary</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-lg font-bold capitalize">{schedule.status}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Analysis Date</p>
                    <p className="font-semibold">{new Date(schedule.analysisDate).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Total Zones</p>
                    <p className="text-lg font-bold">{schedule.zones.length}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Urgent Zones</p>
                    <p className="text-lg font-bold text-red-600">
                      {schedule.zones.filter(z => z.priority === 'urgent').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Legend</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span className="text-sm">Critical - Immediate irrigation needed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-500"></div>
                    <span className="text-sm">Moderate - Irrigation recommended</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500"></div>
                    <span className="text-sm">Low - Monitor closely</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500"></div>
                    <span className="text-sm">Optimal - No irrigation needed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Droplets className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Irrigation Schedule</h3>
            <p className="text-gray-600 mb-6">
              Click "Generate Schedule" to analyze your field and get AI-powered irrigation recommendations
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SmartIrrigation;
