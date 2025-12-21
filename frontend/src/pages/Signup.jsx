import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext'; // Add this import
import { Sprout, User, Mail, Lock, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCurrentLocation } from '../utils/helpers';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { t, isKannada } = useLanguage(); // Add this line
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
      toast.success(t('locationCaptured'));
    } catch (error) {
      console.error('Location error:', error);
      toast.error(error.message || t('locationFailed'));
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
        toast.success(t('accountCreated'));
        navigate(role === 'farmer' ? '/farmer/dashboard' : '/agent/dashboard', { replace: true });
      } else {
        toast.error(result.error || t('signupFailed'));
        setLoading(false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(t('signupError'));
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
          <h1 className="text-3xl font-bold text-gray-800">{t('createAccount')}</h1>
          <p className="text-gray-600 mt-2">
            {t('join')} <span className="font-semibold text-green-600">KrishiSakha</span>
          </p>
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
            {t('farmer')}
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
            {t('labourAgent')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('fullName')}
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
                placeholder={t('enterYourName')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('email')}
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
              {t('password')}
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
              {t('phoneNumber')}
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
                {t('farmSize')}
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
              {t('location')}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                readOnly
                value={formData.location.address || `${formData.location.lat}, ${formData.location.lng}`}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder={t('locationPlaceholder')}
              />
              <button
                type="button"
                onClick={getLocation}
                disabled={locationLoading}
                className="absolute right-2 top-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {locationLoading ? t('gettingLocation') : t('getLocation')}
              </button>
            </div>
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
            {loading ? t('creatingAccount') : t('createAccount')}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          {t('haveAccount')}{' '}
          <Link to="/login" className="text-green-600 font-semibold hover:underline">
            {t('login')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;