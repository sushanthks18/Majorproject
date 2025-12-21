import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { 
  Sprout, Home, TrendingUp, Activity, Search, 
  FileText, Bell, User, LogOut, Briefcase, 
  Calendar, DollarSign, BarChart3, ShoppingBag, ChevronDown, Leaf, Satellite,
  ClipboardList, Users, MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const Navbar = ({ role = 'farmer' }) => {
  const { user, logout } = useAuth();
  const { t, isKannada } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation(); // Add this line
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleProfileClick = () => {
    setShowProfileMenu(false);
    navigate(`/${role}/profile`);
  };

  // Define navigation items based on role
  const navItems = role === 'farmer' ? [
    { name: t('dashboard'), path: '/farmer/dashboard', icon: Home },
    { name: t('cropRecommendation'), path: '/farmer/crop-recommendation', icon: Sprout },
    { name: t('mandiPrices'), path: '/farmer/mandi-prices', icon: TrendingUp },
    { name: t('myFields'), path: '/farmer/fields', icon: MapPin },
    { name: 'News', path: '/farmer/news', icon: Bell },
    { name: t('services'), path: '/farmer/find-labour', icon: Users },
    { name: t('analytics'), path: '/farmer/analytics', icon: BarChart3 },
  ] : [
    { name: t('dashboard'), path: '/agent/dashboard', icon: Home },
    { name: t('services'), path: '/agent/service-requests', icon: ClipboardList },
  ];

  return (
    <nav className="bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Sprout className="w-8 h-8" />
            <span className="text-xl font-bold">{t('appName')}</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                    isActive 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'hover:bg-white/10'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 hover:bg-white/10 px-3 py-2 rounded-lg transition"
              >
                {/* Profile Picture */}
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {user?.profilePic ? (
                    <img src={user.profilePic} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                
                {/* User Info */}
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs opacity-80 capitalize">{user?.role}</p>
                </div>
                
                <ChevronDown className={`w-4 h-4 transition-transform ${ showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 z-50">
                  {/* User Info in Dropdown */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden">
                        {user?.profilePic ? (
                          <img src={user.profilePic} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-white">{user?.name?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <p className="text-xs text-gray-500 capitalize mt-1">
                          <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            {user?.role}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  {user?.location && (
                    <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-200">
                      <p className="font-medium text-gray-700">Location</p>
                      <p className="text-xs">{user.location.address || `${user.location.lat}, ${user.location.lng}`}</p>
                    </div>
                  )}

                  {/* Phone */}
                  {user?.phone && (
                    <div className="px-4 py-2 text-sm text-gray-600">
                      <p className="font-medium text-gray-700">Phone</p>
                      <p className="text-xs">{user.phone}</p>
                    </div>
                  )}

                  {/* Profile Button */}
                  <button
                    onClick={handleProfileClick}
                    className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">{t('profile')}</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">{t('logout')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;