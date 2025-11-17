import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { User, Briefcase, DollarSign, Users, Wrench, MapPin, Navigation } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { serviceLabels, getCurrentLocation } from '../../utils/helpers';

const AgentProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [profile, setProfile] = useState({
    services: [],
    experience: 0,
    hourlyRate: 0,
    laborCount: 1,
    equipment: [],
    availability: 'available'
  });
  const [currentLocation, setCurrentLocation] = useState(user?.location || { lat: 0, lng: 0, address: '' });
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/agents/my-profile');
      
      // Update profile with fetched data
      setProfile({
        services: response.data.services || [],
        experience: response.data.experience || 0,
        hourlyRate: response.data.hourlyRate || 0,
        laborCount: response.data.laborCount || 1,
        equipment: response.data.equipment || [],
        availability: response.data.availability || 'available'
      });
    } catch (error) {
      // If profile doesn't exist (404), that's okay - user can create one
      if (error.response?.status === 404) {
        console.log('No profile found, user can create one');
      } else {
        console.error('Error fetching profile:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (service) => {
    setProfile(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      console.log('🌍 Getting FRESH current location...');
      
      // Request fresh location with high accuracy
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      const location = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            console.log(`📍 GPS Coordinates: ${lat}, ${lng}`);
            
            // Get address from coordinates using reverse geocoding
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
              );
              const data = await response.json();
              const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
              
              console.log('📍 Address:', address);
              resolve({ lat, lng, address });
            } catch (error) {
              console.warn('Failed to get address, using coordinates only');
              resolve({ lat, lng, address: '' });
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            reject(new Error('Failed to get location. Please enable GPS and allow location access.'));
          },
          {
            enableHighAccuracy: true,  // Use GPS for better accuracy
            timeout: 10000,            // Wait up to 10 seconds
            maximumAge: 0              // Don't use cached position
          }
        );
      });

      console.log('✅ Location received:', location);
      setCurrentLocation(location);
      toast.success(`Location captured: ${location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}`);
    } catch (error) {
      console.error('Location error:', error);
      toast.error(error.message || 'Failed to get location. Please enable GPS.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleClearLocation = () => {
    setCurrentLocation({ lat: 0, lng: 0, address: '' });
    setManualLat('');
    setManualLng('');
    toast.success('Location cleared');
  };

  const handleSetManualLocation = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Please enter valid coordinates');
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Invalid coordinates range');
      return;
    }

    try {
      // Get address from coordinates
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      setCurrentLocation({ lat, lng, address });
      setShowManualInput(false);
      toast.success('Location set successfully!');
    } catch (error) {
      setCurrentLocation({ lat, lng, address: '' });
      setShowManualInput(false);
      toast.success('Location coordinates set!');
    }
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (profile.services.length === 0) {
        toast.error('Please select at least one service');
        return;
      }
      if (profile.hourlyRate <= 0) {
        toast.error('Please set a valid hourly rate');
        return;
      }
      
      console.log('💾 Saving profile with location:', currentLocation);
      
      // Update user location in the backend FIRST
      if (currentLocation.lat !== 0 && currentLocation.lng !== 0) {
        try {
          console.log('📍 Updating location to:', currentLocation);
          const locationResponse = await api.put('/auth/update-location', { location: currentLocation });
          console.log('✅ Location update response:', locationResponse.data);
          toast.success(`Location updated: ${currentLocation.address || 'Coordinates saved'}`);
        } catch (error) {
          console.error('❌ Failed to update location:', error);
          toast.error('Failed to update location');
          return; // Don't continue if location update fails
        }
      } else {
        console.warn('⚠️ No location captured yet');
      }
      
      // Then save agent profile
      console.log('📝 Saving agent profile:', profile);
      await api.post('/agents/register', profile);
      toast.success('Profile saved successfully!');
      
      // Refetch profile to ensure UI is in sync
      await fetchProfile();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save profile. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar role="agent" />
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="agent" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your labour service profile</p>
        </div>

        <Card className="mb-6">
          <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-gray-600">{user?.phone}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Services */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Briefcase className="w-5 h-5" />
                Services Offered
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(serviceLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleServiceToggle(key)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      profile.services.includes(key)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-5 h-5" />
                Experience (years)
              </label>
              <input
                type="number"
                value={profile.experience}
                onChange={(e) => setProfile({ ...profile, experience: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>

            {/* Hourly Rate */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-5 h-5" />
                Hourly Rate (₹)
              </label>
              <input
                type="number"
                value={profile.hourlyRate}
                onChange={(e) => setProfile({ ...profile, hourlyRate: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>

            {/* Labor Count */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Users className="w-5 h-5" />
                Number of Laborers Available
              </label>
              <input
                type="number"
                value={profile.laborCount}
                onChange={(e) => setProfile({ ...profile, laborCount: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>

            {/* Equipment */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Wrench className="w-5 h-5" />
                Equipment Available (comma separated)
              </label>
              <input
                type="text"
                value={profile.equipment.join(', ')}
                onChange={(e) => setProfile({ 
                  ...profile, 
                  equipment: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Tractor, Sprayer, Harvester"
              />
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Availability Status</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setProfile({ ...profile, availability: 'available' })}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                    profile.availability === 'available'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Available
                </button>
                <button
                  onClick={() => setProfile({ ...profile, availability: 'busy' })}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                    profile.availability === 'busy'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Busy
                </button>
              </div>
            </div>

            {/* Current Location */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-5 h-5" />
                Your Current Location
              </label>
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg">
                  {currentLocation.lat === 0 && currentLocation.lng === 0 ? (
                    <p className="text-sm text-gray-600">Location not set</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-800">
                        📍 {currentLocation.address || 'Location set'}
                      </p>
                      <p className="text-xs text-gray-600 font-mono">
                        {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>

                {!showManualInput ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleGetLocation}
                      disabled={locationLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Navigation className="w-5 h-5" />
                      {locationLoading ? 'Getting Location...' : 'Use GPS'}
                    </button>
                    <button
                      onClick={() => setShowManualInput(true)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-5 h-5" />
                      Enter Manually
                    </button>
                    {currentLocation.lat !== 0 && currentLocation.lng !== 0 && (
                      <button
                        onClick={handleClearLocation}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-800 mb-3">Enter Location Coordinates</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g., 13.3379"
                            value={manualLat}
                            onChange={(e) => setManualLat(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="e.g., 77.1006"
                            value={manualLng}
                            onChange={(e) => setManualLng(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Tumkuru: 13.3379, 77.1006
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSetManualLocation}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                      >
                        Set Location
                      </button>
                      <button
                        onClick={() => setShowManualInput(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  ℹ️ Use GPS if you're at your work location. Otherwise, enter coordinates manually.
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Save Profile
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AgentProfile;
