import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Map as MapIcon, Wheat, Layers, Save, RefreshCcw } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Polygon Vertex Drawing logic
const MapDrawHandler = ({ isDrawing, setBoundary, setCenter }) => {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        setBoundary(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
      } else {
        setCenter(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
};

function FieldRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Field details state
  const [fieldName, setFieldName] = useState('');
  const [cropType, setCropType] = useState('');
  const [soilType, setSoilType] = useState('');
  
  // Geographic mapping state natively bound exactly as requested by user
  const [lat, setLat] = useState(13.326447); // Default fallback if no GPS
  const [lng, setLng] = useState(77.128510);
  const [boundary, setBoundary] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Common soil types
  const soilTypes = ['Alluvial Soil', 'Black Soil (Regur)', 'Red Soil', 'Laterite Soil', 'Desert Soil', 'Mountain Soil', 'Clay Loam', 'Sandy Loam'];

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        toast.success('Current Location Focused!');
        setLocationLoading(false);
      },
      (error) => {
        toast.error('Failed to get location');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleRegisterField = async () => {
    if (!fieldName) {
      toast.error('Field Name is required');
      return;
    }
    if (boundary.length < 3) {
      toast.error('You must actively draw a valid real-world polygon (Min 3 Points) representing your land boundary!');
      return;
    }

    setLoading(true);
    try {
      // Backend precisely natively unpacks coordinates compliant to GeoJSON ([lng, lat])
      const geoJsonBoundary = [...boundary.map(c => [c[1], c[0]]), [boundary[0][1], boundary[0][0]]];

      const response = await api.post('/fields/register-by-polygon', {
        name: fieldName,
        coordinates: [geoJsonBoundary], // Ensure nested structure for Poly
        cropType,
        soilType
      });

      if (response && response.data) {
        toast.success(`🚜 True Field Layout Registered!`);
        navigate(`/farmer/satellite-monitoring/${response.data.field?._id || ''}`);
      }
    } catch (error) {
      console.error('Error registering field:', error);
      toast.error(error.response?.data?.error || 'Failed to map and register field polygon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Register Real-World Field Boundary</h1>
          <p className="text-gray-600">Please provide the strict bounding coordinates of your actual physical land parcel using our integrated satellite architecture.</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 grid lg:grid-cols-3 gap-6">
          
          {/* Form Setup Column */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">1. Field Characteristics</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Profile Name *</label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g. South Mango Plot"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
              <input
                type="text"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                placeholder="e.g. Rice, Mango"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Soil Properties</label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500"
              >
                <option value="">Select Physical Soil Type</option>
                {soilTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="pt-6">
              <button
                onClick={handleRegisterField}
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow flex justify-center items-center gap-2"
              >
                {loading ? <RefreshCcw className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                {loading ? 'Mapping Server...' : 'Commit Exact Boundary'}
              </button>
            </div>
          </div>

          {/* Map Column */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">2. Draw Your Farm Boundary (Satellites)</h2>
            <div className="bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-300 mb-3 relative group">
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <button
                   onClick={handleGetCurrentLocation}
                   className="px-3 py-1.5 bg-white/90 backdrop-blur text-blue-700 text-sm font-bold border border-blue-200 rounded shadow hover:bg-blue-50"
                 >
                   📍 Locate Me
                 </button>
                 {isDrawing ? (
                   <button
                     onClick={() => setIsDrawing(false)}
                     className="px-3 py-1.5 bg-green-600 text-white text-sm font-bold border border-green-700 rounded shadow hover:bg-green-500"
                   >
                     ✅ Done Selecting
                   </button>
                 ) : (
                   <button
                     onClick={() => setIsDrawing(true)}
                     className="px-3 py-1.5 bg-gray-800 text-white text-sm font-bold border border-gray-900 rounded shadow hover:bg-gray-700"
                   >
                     ✏️ Draw Field Boundary
                   </button>
                 )}
                 {boundary.length > 0 && (
                   <button
                     onClick={() => setBoundary([])}
                     className="px-3 py-1.5 bg-red-600 text-white text-sm font-bold border border-red-700 rounded shadow hover:bg-red-500"
                   >
                     Clear
                   </button>
                 )}
              </div>
              <div className="h-[450px] w-full z-0">
                <MapContainer 
                  center={[lat, lng]} 
                  zoom={18} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer 
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri"
                  />
                  <Marker position={[lat, lng]} />
                  {boundary.length > 0 && (
                    <Polygon 
                      positions={boundary} 
                      pathOptions={{ color: '#ffeb3b', weight: 4, fillColor: '#ffeb3b', fillOpacity: 0.35 }} 
                    />
                  )}
                  <MapDrawHandler isDrawing={isDrawing} setBoundary={setBoundary} setCenter={(lt, lg) => { setLat(lt); setLng(lg); }} />
                </MapContainer>
              </div>
            </div>
            
            <div className="flex flex-col gap-1 text-sm bg-blue-50 border border-blue-100 p-3 rounded">
               <strong className="text-blue-800">Geographic Layout Summary:</strong>
               {boundary.length > 0 ? (
                 <span className="text-green-700 font-semibold">✅ {boundary.length} vertices plotted successfully.</span>
               ) : (
                 <span className="text-gray-500">❌ No vertices drawn. Click 'Draw Field Boundary' to begin manually clicking your physical perimeter.</span>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FieldRegistration;
