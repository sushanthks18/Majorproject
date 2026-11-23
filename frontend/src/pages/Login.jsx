import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext'; // Add this import
import { Sprout, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, isKannada } = useLanguage(); // Add this line
  const [role, setRole] = useState('farmer');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return; // Prevent double submission
    
    setLoading(true);
    
    try {
      console.log('Attempting login with:', { email: formData.email, role });
      const result = await login(formData.email, formData.password, role);
      
      console.log('Login result:', result);
      
      if (result.success) {
        toast.success(t('loginSuccessful'));
        // Use setTimeout to ensure state is updated before navigation
        setTimeout(() => {
          navigate(role === 'farmer' ? '/farmer/dashboard' : '/agent/dashboard', { replace: true });
        }, 100);
      } else {
        toast.error(result.error || t('loginFailed'));
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.error || t('loginError'));
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
              <div className="relative bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-4">
                <Sprout className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">{t('appName')}</h1>
          <p className="text-sm text-green-600 font-semibold mt-1 tracking-wide">{t('tagline')}</p>
          <div className="h-px bg-gradient-to-r from-transparent via-green-300 to-transparent my-4 w-32 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-700">{t('welcomeBack')}</h2>
          <p className="text-gray-600 mt-1">
            {t('loginTo')} {t('appName')}
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
              />
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
            {loading ? t('loggingIn') : t('login')}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          {t('noAccount')}{' '}
          <Link to="/signup" className="text-green-600 font-semibold hover:underline">
            {t('signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;