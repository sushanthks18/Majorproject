import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout, User, Mail, Lock, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCurrentLocation } from '../utils/helpers';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [role, setRole] = useState('farmer');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    farmSize: '',
    location: { lat: 0, lng: 0, address: '' }
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getLocation = async () => {
    setLocationLoading(true);
    try {
      console.log('Getting location...');
      const location = await getCurrentLocation();
      console.log('Location received:', location);
      setFormData({ ...formData, location });
      toast.success('Location captured successfully!');
    } catch (error) {
      console.error('Location error:', error);
      toast.error(error.message || 'Failed to get location. Please enable GPS and location permissions.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const result = await signup({ ...formData, role });
      
      if (result.success) {
        toast.success('Account created successfully!');
        navigate(role === 'farmer' ? '/farmer/dashboard' : '/agent/dashboard', { replace: true });
      } else {
        toast.error(result.error || 'Signup failed');
        setLoading(false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An error occurred during signup');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {/* Logo with gradient */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-green-400 rounded-full blur-lg opacity-50"></div>
              <div className="relative bg-gradient-to-br from-green-500 to-green-600 rounded-full p-4">
                <Sprout className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-600 mt-2">Join <span className="font-semibold text-green-600">KrishiSakha</span></p>
        </div>

        {/* Role Selection */}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setRole('farmer')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              role === 'farmer'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Farmer
          </button>
          <button
            type="button"
            onClick={() => setRole('agent')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
              role === 'agent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Labour Agent
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="1234567890"
              />
            </div>
          </div>

          {role === 'farmer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Farm Size (acres)
              </label>
              <input
                type="number"
                name="farmSize"
                required
                value={formData.farmSize}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="5"
                min="0.1"
                step="0.1"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location (Optional) {formData.location.lat !== 0 && '✓'}
            </label>
            <button
              type="button"
              onClick={getLocation}
              disabled={locationLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MapPin className="w-5 h-5" />
              {locationLoading
                ? 'Capturing Location...'
                : formData.location.lat !== 0
                ? `Location Captured ✓`
                : 'Capture Current Location (Optional)'}
            </button>
            {formData.location.address && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {formData.location.address}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition ${
              role === 'farmer'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
