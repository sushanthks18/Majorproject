import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Satellite, MapPin, TrendingUp, AlertTriangle, CheckCircle, Loader, Map as MapIconLucide, ArrowLeft, Lock } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to auto-fit map bounds
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

function SatelliteMonitoring() {
  const { fieldId } = useParams();
  const navigate = useNavigate();
  
  const [field, setField] = useState(null);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    loadFieldData();
  }, [fieldId]);

  const loadFieldData = async () => {
    try {
      setLoading(true);
      
      // Load field details
      const fieldsResponse = await api.get('/fields');
      const currentField = fieldsResponse.data.find(f => f._id === fieldId);
      
      if (!currentField) {
        toast.error('Field not found');
        navigate('/farmer/fields');
        return;
      }
      
      setField(currentField);

      // Load latest analysis
      try {
        const analysisResponse = await api.get(`/satellite/latest/${fieldId}`);
        setLatestAnalysis(analysisResponse.data);
      } catch (error) {
        // No analysis yet - will show empty state
        console.log('No analysis found yet');
        setLatestAnalysis(null);
      }

      // Load analysis history
      try {
        const historyResponse = await api.get(`/satellite/history/${fieldId}`);
        setAnalysisHistory(historyResponse.data);
      } catch (error) {
        console.log('No history found');
      }

    } catch (error) {
      console.error('Error loading field data:', error);
      toast.error('Failed to load field data');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSatelliteData = async () => {
    try {
      setFetching(true);
      toast.loading('Fetching satellite data...', { id: 'fetch' });
      
      const response = await api.post(`/satellite/fetch-data/${fieldId}`, {
        daysBack: 30
      });
      
      toast.success(`Satellite data fetched: ${response.data.satellite}`, { id: 'fetch' });
      
      // Automatically trigger analysis
      handleAnalyzeNDVI();
      
    } catch (error) {
      console.error('Error fetching satellite data:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch satellite data', { id: 'fetch' });
      setFetching(false);
    }
  };

  const handleAnalyzeNDVI = async () => {
    try {
      setAnalyzing(true);
      toast.loading('Analyzing NDVI...', { id: 'analyze' });
      
      const response = await api.post(`/satellite/analyze-ndvi/${fieldId}`);
      
      toast.success('NDVI analysis complete!', { id: 'analyze' });
      
      setLatestAnalysis(response.data);
      
      // Reload history
      try {
        const historyResponse = await api.get(`/satellite/history/${fieldId}`);
        setAnalysisHistory(historyResponse.data);
      } catch (error) {
        console.log('No history found');
      }
      
    } catch (error) {
      console.error('Error analyzing NDVI:', error);
      toast.error(error.response?.data?.message || 'Failed to analyze NDVI', { id: 'analyze' });
    } finally {
      setAnalyzing(false);
      setFetching(false);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStressLevelColor = (level) => {
    if (level === 'healthy') return 'bg-green-500';
    if (level === 'moderate') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStressLevelIcon = (level) => {
    if (level === 'healthy') return <CheckCircle className="w-5 h-5" />;
    if (level === 'moderate') return <AlertTriangle className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  const getZoneColor = (level) => {
    if (level === 'healthy') return '#22c55e'; // green
    if (level === 'moderate') return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  // Calculate map bounds from field boundary
  const getFieldBounds = () => {
    if (!field || !field.boundary || !field.boundary.coordinates) return null;
    const coords = field.boundary.coordinates[0];
    return coords.map(coord => [coord[1], coord[0]]); // [lat, lng]
  };

  // Get field center for map focus
  const getFieldCenter = () => {
    if (!field || !field.boundary || !field.boundary.coordinates) {
      return [13.3379, 77.1006]; // Default Bangalore coordinates
    }
    const coords = field.boundary.coordinates[0];
    let centerLat = 0, centerLng = 0;
    coords.forEach(coord => {
      centerLng += coord[0];
      centerLat += coord[1];
    });
    centerLat /= coords.length;
    centerLng /= coords.length;
    return [centerLat, centerLng];
  };

  // Create custom marker icons for sensors
  const createSensorIcon = (number, priority) => {
    const color = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#eab308' : '#22c55e';
    return L.divIcon({
      className: 'custom-sensor-marker',
      html: `<div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${number}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
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
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/farmer/fields')}
            className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Fields
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{field?.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Area: {field?.areaHectares} hectares</span>
                {field?.cropType && <span>• Crop: {field?.cropType}</span>}
                {field?.soilType && <span>• Soil: {field?.soilType}</span>}
              </div>
              {/* Display locked crop info if exists */}
              {field?.isCropLocked && (
                <div className="mt-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-600">
                    Locked Crop: {field?.lockedCrop} (since {new Date(field?.cropLockDate).toLocaleDateString()})
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={handleFetchSatelliteData}
              disabled={fetching || analyzing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Satellite className="w-4 h-4" />
              {fetching || analyzing ? 'Processing...' : 'Fetch Satellite Data'}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Analysis Overview */}
          <div className="lg:col-span-2 space-y-6">
            {latestAnalysis ? (
              <>
                {/* Health Score Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Field Health Score</h2>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`text-4xl font-bold px-6 py-3 rounded-lg ${getHealthColor(latestAnalysis.healthScore)}`}>
                      {Math.round(latestAnalysis.healthScore)}
                    </div>
                    <div>
                      <p className="text-gray-600">Mean NDVI: {latestAnalysis.meanNdvi?.toFixed(3)}</p>
                      <p className="text-sm text-gray-500">
                        Analyzed: {new Date(latestAnalysis.acquisitionDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Cloud Cover: {latestAnalysis.cloudCover?.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600">
                      {latestAnalysis.totalSensorsNeeded} IoT sensors recommended for optimal monitoring
                    </span>
                  </div>
                </div>

                {/* Sensor Location Summary Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white bg-opacity-20 rounded-full p-3">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">📡 IoT Sensor Installation Map</h2>
                      <p className="text-blue-100 text-sm">Click on numbered markers below to see exact GPS coordinates</p>
                    </div>
                  </div>
                  
                  <div className="bg-white bg-opacity-10 rounded-lg p-4 border border-white border-opacity-20">
                    <p className="text-sm mb-2 font-semibold">📍 {latestAnalysis.sensorPlacements?.length || 0} Installation Points Marked on Satellite Map:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {latestAnalysis.sensorPlacements?.map((sensor, index) => (
                        <div key={index} className="bg-white bg-opacity-10 rounded px-3 py-2 text-xs">
                          <span className="font-bold">Sensor #{sensor.placementNumber}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            sensor.priority === 'high' ? 'bg-red-500' :
                            sensor.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}>
                            {sensor.priority.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Interactive Map */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapIconLucide className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Field Map & Analysis</h2>
                  </div>
                  
                  <div className="rounded-lg overflow-hidden border-2 border-gray-200" style={{ height: '800px' }}>
                    {getFieldBounds() ? (
                      <MapContainer
                        center={getFieldCenter()}
                        zoom={17}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                      >
                        {/* Satellite Basemap */}
                        <TileLayer
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                        />
                        
                        {/* Labels Overlay */}
                        <TileLayer
                          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />

                        {/* Field Boundary */}
                        <Polygon
                          positions={getFieldBounds()}
                          pathOptions={{
                            color: '#3b82f6',
                            fillColor: '#3b82f6',
                            fillOpacity: 0.2,
                            weight: 4,
                          }}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-semibold text-lg">{field.name}</p>
                              <p className="mt-1">Area: {field.areaHectares} hectares</p>
                              {field.cropType && <p>Crop: {field.cropType}</p>}
                              {field.soilType && <p>Soil: {field.soilType}</p>}
                              {field.surveyNumber && <p className="font-mono text-xs mt-1">Survey: {field.surveyNumber}</p>}
                            </div>
                          </Popup>
                        </Polygon>

                        {/* Field Center Marker */}
                        <Marker position={getFieldCenter()}>
                          <Popup>
                            <div className="text-sm">
                              <p className="font-semibold">{field.name}</p>
                              <p className="text-xs text-gray-600">Field Center</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Stress Zones */}
                        {latestAnalysis?.zones?.map((zone, index) => {
                          if (!zone.boundary || !zone.boundary.coordinates || !zone.boundary.coordinates[0]) return null;
                          const zoneCoords = zone.boundary.coordinates[0].map(coord => [coord[1], coord[0]]);
                          if (zoneCoords.length === 0) return null;
                          return (
                            <Polygon
                              key={index}
                              positions={zoneCoords}
                              pathOptions={{
                                color: getZoneColor(zone.stressLevel),
                                fillColor: getZoneColor(zone.stressLevel),
                                fillOpacity: 0.4,
                                weight: 2,
                              }}
                            >
                              <Popup>
                                <div className="text-sm">
                                  <p className="font-semibold">{zone.zoneName}</p>
                                  <p className="capitalize">Status: {zone.stressLevel}</p>
                                  <p>NDVI: {zone.meanNdvi?.toFixed(3)}</p>
                                  <p>Area: {zone.areaHectares} ha</p>
                                </div>
                              </Popup>
                            </Polygon>
                          );
                        })}

                        {/* Sensor Placement Markers */}
                        {latestAnalysis.sensorPlacements?.filter(sensor => sensor.gpsLat && sensor.gpsLon).map((sensor, index) => (
                          <Marker
                            key={index}
                            position={[sensor.gpsLat, sensor.gpsLon]}
                            icon={createSensorIcon(sensor.placementNumber, sensor.priority)}
                          >
                            <Popup maxWidth={300}>
                              <div className="text-sm">
                                <p className="font-semibold text-lg mb-2">📍 Sensor #{sensor.placementNumber}</p>
                                <p className={`text-xs px-2 py-1 rounded-full inline-block mb-2 ${
                                  sensor.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  sensor.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {sensor.priority.toUpperCase()} PRIORITY
                                </p>
                                <p className="text-xs mb-3 font-semibold text-gray-700">{sensor.reason}</p>
                                
                                <div className="bg-blue-50 border-2 border-blue-300 rounded p-2 mb-2">
                                  <p className="text-xs font-bold text-blue-900 mb-1">📌 EXACT INSTALLATION LOCATION:</p>
                                  <p className="text-xs font-mono text-blue-900 font-semibold">
                                    Latitude: {sensor.gpsLat?.toFixed(6)}
                                  </p>
                                  <p className="text-xs font-mono text-blue-900 font-semibold">
                                    Longitude: {sensor.gpsLon?.toFixed(6)}
                                  </p>
                                </div>
                                
                                <div className="bg-green-50 border-2 border-green-300 rounded p-2 mb-2">
                                  <p className="text-xs font-bold text-green-800 mb-1">✓ Installation Instructions:</p>
                                  <ol className="text-xs text-green-900 mt-1 ml-3 list-decimal space-y-1">
                                    <li>Navigate to exact GPS coordinates above</li>
                                    <li>Install IoT sensor at ground level (15-20cm depth)</li>
                                    <li>Ensure proper soil contact for accurate readings</li>
                                    <li>Connect to WiFi/cellular network</li>
                                    <li>Test sensor data transmission</li>
                                  </ol>
                                </div>
                                
                                <button
                                  onClick={() => window.open(`https://www.google.com/maps?q=${sensor.gpsLat},${sensor.gpsLon}`, '_blank')}
                                  className="w-full bg-blue-600 text-white text-xs py-2 px-3 rounded hover:bg-blue-700 cursor-pointer border-none mt-2 font-semibold"
                                >
                                  🗺️ Navigate with Google Maps
                                </button>
                              </div>
                            </Popup>
                          </Marker>
                        ))}

                        {/* Auto-fit bounds */}
                        <FitBounds bounds={getFieldBounds()} />
                      </MapContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-100">
                        <p className="text-gray-600">Field boundary data not available</p>
                      </div>
                    )}
                  </div>

                  {/* Map Legend */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Legend</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border-2 border-blue-600 bg-blue-600 bg-opacity-20"></div>
                        <span>Field Boundary</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-500"></div>
                        <span>Healthy Zone</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-yellow-500"></div>
                        <span>Moderate Stress</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-500"></div>
                        <span>Critical Stress</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-xs text-gray-600 mb-2">Sensor Priority:</p>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                          <span className="text-xs">High</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                          <span className="text-xs">Medium</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">3</div>
                          <span className="text-xs">Low</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stress Zones */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Detected Zones ({latestAnalysis.zones?.length || 0})
                  </h2>
                  
                  <div className="space-y-3">
                    {latestAnalysis.zones?.map((zone, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${getStressLevelColor(zone.stressLevel)} text-white`}>
                              {getStressLevelIcon(zone.stressLevel)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800">{zone.zoneName}</h3>
                              <p className="text-sm text-gray-600">
                                Area: {zone.areaHectares} ha • NDVI: {zone.meanNdvi?.toFixed(3)}
                              </p>
                              <p className="text-xs text-gray-500 capitalize mt-1">
                                Status: {zone.stressLevel}
                              </p>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full ${getStressLevelColor(zone.stressLevel)}`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sensor Placements */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-800">
                      📡 IoT Sensor Installation Locations ({latestAnalysis.sensorPlacements?.length || 0})
                    </h2>
                  </div>
                  
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4">
                    <p className="text-sm text-yellow-800 font-semibold">
                      ⚠️ Important: Install sensors at the EXACT GPS coordinates shown below for optimal field monitoring
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {latestAnalysis.sensorPlacements?.map((sensor, index) => (
                      <div key={index} className="border-2 border-gray-300 rounded-lg p-4 hover:border-blue-400 transition">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg ${
                            sensor.priority === 'high' ? 'bg-red-600' :
                            sensor.priority === 'medium' ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}>
                            {sensor.placementNumber}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-gray-900 text-base">
                                Sensor Installation Point #{sensor.placementNumber}
                              </h3>
                              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                sensor.priority === 'high' ? 'bg-red-100 text-red-800 border border-red-300' :
                                sensor.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                'bg-green-100 text-green-800 border border-green-300'
                              }`}>
                                {sensor.priority.toUpperCase()} PRIORITY
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-700 mb-3 font-medium">🎯 {sensor.reason}</p>
                            
                            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 mb-3">
                              <p className="text-xs font-bold text-blue-900 mb-2">📌 EXACT GPS COORDINATES:</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs text-blue-700">Latitude:</p>
                                  <p className="font-mono font-bold text-sm text-blue-900">{sensor.gpsLat?.toFixed(6)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-blue-700">Longitude:</p>
                                  <p className="font-mono font-bold text-sm text-blue-900">{sensor.gpsLon?.toFixed(6)}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-3">
                              <p className="text-xs font-bold text-green-800 mb-2">✓ Installation Checklist:</p>
                              <ol className="text-xs text-green-900 ml-4 list-decimal space-y-1">
                                <li>Navigate to GPS coordinates using map below</li>
                                <li>Dig 15-20cm deep hole for sensor placement</li>
                                <li>Install IoT sensor with soil moisture probe</li>
                                <li>Ensure good soil contact for accurate readings</li>
                                <li>Configure WiFi/cellular connection</li>
                                <li>Test data transmission to cloud</li>
                              </ol>
                            </div>
                            
                            <button
                              onClick={() => window.open(`https://www.google.com/maps?q=${sensor.gpsLat},${sensor.gpsLon}`, '_blank')}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg cursor-pointer border-none transition flex items-center justify-center gap-2"
                            >
                              <MapPin className="w-4 h-4" />
                              🗺️ Navigate to This Location with Google Maps
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Satellite className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Analysis Available</h3>
                <p className="text-gray-600 mb-6">
                  Click "Fetch Satellite Data" to analyze your field using Sentinel-2 satellite imagery
                </p>
              </div>
            )}
          </div>

          {/* Right: History & Stats */}
          <div className="space-y-6">
            {/* Analysis History */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Analysis History</h2>
              
              {analysisHistory.length > 0 ? (
                <div className="space-y-3">
                  {analysisHistory.map((analysis, index) => (
                    <div key={index} className="border-l-4 border-green-500 pl-3 py-2">
                      <p className="font-semibold text-gray-800">
                        Score: {Math.round(analysis.healthScore)}
                      </p>
                      <p className="text-sm text-gray-600">
                        NDVI: {analysis.meanNdvi?.toFixed(3)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(analysis.acquisitionDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No history available yet</p>
              )}
            </div>

            {/* Field Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Field Information</h2>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Registration Type</p>
                  <p className="font-semibold text-gray-800 capitalize">{field.registrationType}</p>
                </div>
                <div>
                  <p className="text-gray-600">Area</p>
                  <p className="font-semibold text-gray-800">{field.areaHectares} hectares</p>
                </div>
                {field.cropType && (
                  <div>
                    <p className="text-gray-600">Crop Type</p>
                    <p className="font-semibold text-gray-800">{field.cropType}</p>
                  </div>
                )}
                {field.soilType && (
                  <div>
                    <p className="text-gray-600">Soil Type</p>
                    <p className="font-semibold text-gray-800">{field.soilType}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">Registered</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(field.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SatelliteMonitoring;
