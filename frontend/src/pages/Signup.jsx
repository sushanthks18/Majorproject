import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, User, Mail, Lock, Phone, MapPin, Map as MapIcon, Wheat, Layers, MapPin as LocationIcon } from 'lucide-react';
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

// Map Click Handler for drawing Polygons
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

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { t } = useLanguage();
  const [role, setRole] = useState('farmer');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Map State
  const [isDrawing, setIsDrawing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    farmDetails: {
      fieldName: '',
      village: '',
      district: '',
      state: 'Karnataka',
      crop: '',
      soil: '',
      lat: 13.326447, // Default center
      lng: 77.128510,
      boundary: []
    }
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFarmDetailsChange = (e) => {
    setFormData({
      ...formData,
      farmDetails: {
        ...formData.farmDetails,
        [e.target.name]: e.target.value
      }
    });
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          farmDetails: {
            ...formData.farmDetails,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        });
        toast.success("Location Captured Successfully!");
        setLocationLoading(false);
      },
      () => {
        toast.error("Unable to retrieve your location");
        setLocationLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (role === 'farmer') {
      if (!formData.farmDetails.fieldName || !formData.farmDetails.village || !formData.farmDetails.soil || !formData.farmDetails.crop) {
        toast.error("Please fill all mandatory Farm Details.");
        return;
      }
      if (formData.farmDetails.boundary.length < 3) {
        toast.error("Please explicitly draw your actual Real-World Farm Boundary (Minimum 3 points required) using the mapping tool before registering.");
        return;
      }
    }

    setLoading(true);
    try {
      // Structure the data as requested by standard auth payload
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: role,
        location: { lat: formData.farmDetails.lat, lng: formData.farmDetails.lng, address: formData.farmDetails.village },
        farmDetails: role === 'farmer' ? formData.farmDetails : {}
      };

      const result = await signup(payload);
      
      if (result.success) {
        toast.success('Account Created Successfully!');
        navigate(role === 'farmer' ? '/farmer/dashboard' : '/agent/dashboard', { replace: true });
      } else {
        toast.error(result.error || 'Signup Failed');
        setLoading(false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('A system error occurred');
      setLoading(false);
    }
  };

  // Safe boundary display configuration mapping
  const safeBoundaryPoly = formData.farmDetails.boundary.length > 0 
    ? formData.farmDetails.boundary 
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        
        <div className="text-center py-6 bg-gradient-to-r from-green-600 to-green-500 text-white">
          <div className="flex justify-center mb-2">
             <Sprout className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Create an Account</h1>
          <p className="mt-1 opacity-90">Join the KrishiSakha Smart Agriculture Platform</p>
        </div>

        <div className="p-8">
          {/* Role Selection */}
          <div className="flex gap-4 mb-8">
            <button
              type="button"
              onClick={() => setRole('farmer')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                role === 'farmer'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Farmer Account
            </button>
            <button
              type="button"
              onClick={() => setRole('agent')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                role === 'agent'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Labour Agent Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Basic Details Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Sushanth"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="••••••••"
                    minLength="6"
                  />
                </div>
              </div>
            </div>

            {/* 2. Farm Details & Interactive Map (Farmer Only) */}
            {role === 'farmer' && (
              <div className="mt-8 border-t border-gray-200 pt-8">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Farm Details</h3>
                  <p className="text-sm text-gray-500">Provide precise telemetry and land data for satellite analysis.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
                    <input
                      type="text"
                      name="fieldName"
                      required={role === 'farmer'}
                      value={formData.farmDetails.fieldName}
                      onChange={handleFarmDetailsChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="e.g. My Farm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Village Name *</label>
                    <input
                      type="text"
                      name="village"
                      required={role === 'farmer'}
                      value={formData.farmDetails.village}
                      onChange={handleFarmDetailsChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="e.g. Tumkur"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                    <input
                      type="text"
                      name="district"
                      value={formData.farmDetails.district}
                      onChange={handleFarmDetailsChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="e.g. Tumkur"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type *</label>
                    <div className="relative">
                      <Wheat className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="crop"
                        required={role === 'farmer'}
                        value={formData.farmDetails.crop}
                        onChange={handleFarmDetailsChange}
                        className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="e.g. Ragi"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soil Type *</label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <select
                        name="soil"
                        required={role === 'farmer'}
                        value={formData.farmDetails.soil}
                        onChange={handleFarmDetailsChange}
                        className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select Soil Type</option>
                        <option value="Red Soil">Red Soil</option>
                        <option value="Black Soil (Regur)">Black Soil</option>
                        <option value="Alluvial Soil">Alluvial Soil</option>
                        <option value="Laterite Soil">Laterite Soil</option>
                        <option value="Clay Loam">Clay Loam</option>
                        <option value="Sandy Loam">Sandy Loam</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Map Integration */}
                <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <MapIcon className="text-green-600 w-5 h-5"/>
                      Farm Geography Locator
                    </h4>
                    <button
                      type="button"
                      onClick={getLocation}
                      disabled={locationLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <LocationIcon className="w-4 h-4"/>
                      {locationLoading ? 'Locating...' : 'Use Current Location'}
                    </button>
                  </div>
                  
                  <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gray-300 z-0 relative">
                     <MapContainer 
                        center={[formData.farmDetails.lat, formData.farmDetails.lng]} 
                        zoom={17} 
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer 
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                        />
                        
                        <Marker position={[formData.farmDetails.lat, formData.farmDetails.lng]} />
                        
                        {safeBoundaryPoly.length > 0 && <Polygon positions={safeBoundaryPoly} pathOptions={{ color: '#00ff00', weight: 3, fillColor: '#00ff00', fillOpacity: 0.4 }} />}
                        
                        <MapDrawHandler 
                          isDrawing={isDrawing} 
                          setBoundary={(fn) => setFormData(p => ({ ...p, farmDetails: { ...p.farmDetails, boundary: fn(p.farmDetails.boundary) } }))}
                          setCenter={(lat, lng) => setFormData(p => ({ ...p, farmDetails: { ...p.farmDetails, lat, lng }}))}
                        />
                      </MapContainer>
                  </div>

                  <div className="mt-3 flex gap-3 justify-between items-center">
                    <div className="text-sm text-gray-500">
                      <p><strong>Lat:</strong> {formData.farmDetails.lat.toFixed(6)} | <strong>Lng:</strong> {formData.farmDetails.lng.toFixed(6)}</p>
                      <p>{formData.farmDetails.boundary.length} boundary points saved</p>
                    </div>
                    <div className="flex gap-2">
                      {isDrawing ? (
                        <>
                          <button 
                            type="button" 
                            className="px-3 py-1 bg-red-100 text-red-700 rounded border border-red-300 text-sm hover:bg-red-200"
                            onClick={() => {
                              setFormData(p => ({ ...p, farmDetails: { ...p.farmDetails, boundary: [] }}));
                            }}
                          >
                            Clear Boundary
                          </button>
                          <button 
                            type="button" 
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            onClick={() => setIsDrawing(false)}
                          >
                            Done Drawing
                          </button>
                        </>
                      ) : (
                        <button 
                          type="button" 
                          className="px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-900"
                          onClick={() => setIsDrawing(true)}
                        >
                          Draw Field Boundary
                        </button>
                      )}
                    </div>
                  </div>
                  {isDrawing && <p className="text-xs text-blue-600 mt-2">📍 Click on the map to place boundary points. Click "Done Drawing" when finished.</p>}
                  {!isDrawing && <p className="text-xs text-gray-500 mt-2">📍 Click anywhere on the map to set your Farm Center pointer.</p>}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition text-lg ${
                role === 'farmer'
                  ? 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/30'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Registering Account & Farm...' : 'Complete Registration'}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6 md:text-lg">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 font-bold hover:underline">
              Log In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;