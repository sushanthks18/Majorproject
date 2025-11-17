import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Sprout, Home, TrendingUp, Activity, Search, 
  FileText, Bell, User, LogOut, Briefcase, 
  Calendar, DollarSign, BarChart3, ShoppingBag, ChevronDown, Leaf, Satellite
} from 'lucide-react';

const Navbar = ({ role = 'farmer' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    const profileRoute = role === 'farmer' ? '/farmer/profile' : '/agent/profile';
    navigate(profileRoute);
    setShowProfileMenu(false);
  };

  const farmerLinks = [
    { to: '/farmer/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/farmer/fields', icon: Satellite, label: 'Satellite Monitoring' },
    { to: '/farmer/notifications', icon: Bell, label: 'Notifications' },
    { to: '/farmer/find-labour', icon: Search, label: 'Find Labour' },
    { to: '/farmer/mandi-prices', icon: ShoppingBag, label: 'Mandi Prices' },
    { to: '/farmer/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const agentLinks = [
    { to: '/agent/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/agent/profile', icon: User, label: 'My Profile' },
    { to: '/agent/requests', icon: FileText, label: 'Service Requests' },
    { to: '/agent/active-jobs', icon: Briefcase, label: 'Active Jobs' },
    { to: '/agent/earnings', icon: DollarSign, label: 'Earnings' },
  ];

  const links = role === 'farmer' ? farmerLinks : agentLinks;
  const primaryColor = role === 'farmer' ? 'green' : 'blue';

  return (
    <nav className={`bg-${primaryColor}-600 text-white shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            {/* Logo with gradient background */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-green-400 rounded-full blur-sm opacity-75"></div>
              <div className="relative bg-white rounded-full p-2">
                <Sprout className="w-6 h-6 text-green-600" />
              </div>
            </div>
            {/* App Name */}
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-wide">KrishiSakha</span>
              <span className="text-xs opacity-80 -mt-1">Your Farm Companion</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
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
                    <span className="text-sm">View Profile</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
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
