import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { 
  Bell, AlertCircle, TrendingUp, CloudRain, Users, Award, 
  DollarSign, Sprout, X, Check, ChevronRight, Filter 
} from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [counts, setCounts] = useState({});

  useEffect(() => {
    fetchNotifications();
    fetchCounts();
    setupRealtimeNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') {
        if (filter === 'unread') {
          params.isRead = false;
        } else {
          params.category = filter;
        }
      }
      
      const response = await api.get('/notifications/all', { params });
      setNotifications(response.data.notifications);
    } catch (error) {
      toast.error('Failed to fetch notifications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const response = await api.get('/notifications/counts');
      setCounts(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const setupRealtimeNotifications = () => {
    const socket = getSocket();
    if (socket) {
      socket.on('notification', (data) => {
        toast.success(data.title, { duration: 5000 });
        fetchNotifications();
        fetchCounts();
      });
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
      fetchCounts();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
      fetchCounts();
      toast.success('Notification deleted');
    } catch (error) {
      console.error(error);
    }
  };

  const handleAction = (notification) => {
    markAsRead(notification._id);
    
    switch (notification.actionType) {
      case 'find_labour':
        navigate('/farmer/find-labour');
        break;
      case 'check_price':
        navigate('/farmer/mandi-prices');
        break;
      case 'view_details':
        // Navigate to My Requests page to view service request details
        navigate('/farmer/my-requests', { 
          state: { 
            fromNotification: true,
            requestId: notification.actionData?.requestId 
          } 
        });
        break;
      case 'book_service':
        navigate('/farmer/find-labour');
        break;
      default:
        break;
    }
  };

  const getIconAndColor = (category, type) => {
    const configs = {
      sensor: { icon: Sprout, color: 'text-green-600 bg-green-100' },
      weather: { icon: CloudRain, color: 'text-blue-600 bg-blue-100' },
      price: { icon: DollarSign, color: 'text-yellow-600 bg-yellow-100' },
      labour: { icon: Users, color: 'text-purple-600 bg-purple-100' },
      disease: { icon: AlertCircle, color: 'text-red-600 bg-red-100' },
      scheme: { icon: Award, color: 'text-indigo-600 bg-indigo-100' },
      crop: { icon: Sprout, color: 'text-green-600 bg-green-100' },
      harvest: { icon: TrendingUp, color: 'text-orange-600 bg-orange-100' }
    };
    
    return configs[category] || { icon: Bell, color: 'text-gray-600 bg-gray-100' };
  };

  const getTypeColor = (type) => {
    const colors = {
      critical: 'border-l-4 border-red-500 bg-red-50',
      alert: 'border-l-4 border-orange-500 bg-orange-50',
      warning: 'border-l-4 border-yellow-500 bg-yellow-50',
      success: 'border-l-4 border-green-500 bg-green-50',
      info: 'border-l-4 border-blue-500 bg-blue-50'
    };
    return colors[type] || '';
  };

  const filters = [
    { id: 'all', label: 'All', count: Object.values(counts).reduce((a, b) => a + (b.total || 0), 0) },
    { id: 'unread', label: 'Unread', count: Object.values(counts).reduce((a, b) => a + (b.unread || 0), 0) },
    { id: 'price', label: 'Price Alerts', count: counts.price?.total || 0 },
    { id: 'weather', label: 'Weather', count: counts.weather?.total || 0 },
    { id: 'labour', label: 'Labour', count: counts.labour?.total || 0 },
    { id: 'sensor', label: 'Sensor', count: counts.sensor?.total || 0 },
    { id: 'disease', label: 'Disease', count: counts.disease?.total || 0 },
    { id: 'crop', label: 'Crop Care', count: counts.crop?.total || 0 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Smart Notifications</h1>
          <p className="text-gray-600">Stay updated with real-time alerts and recommendations</p>
        </div>

        {/* Filter Tabs */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-5 h-5 text-gray-600" />
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                  filter === f.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
                {f.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    filter === f.id ? 'bg-white text-green-600' : 'bg-green-600 text-white'
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>

        {loading ? (
          <Loading message="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No notifications</h3>
              <p className="text-gray-600">You're all caught up!</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const { icon: Icon, color } = getIconAndColor(notification.category, notification.type);
              
              return (
                <Card
                  key={notification._id}
                  className={`${getTypeColor(notification.type)} ${
                    !notification.isRead ? 'shadow-lg' : 'opacity-75'
                  } hover:shadow-xl transition cursor-pointer`}
                  onClick={() => !notification.isRead && markAsRead(notification._id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            {notification.title}
                            {!notification.isRead && (
                              <span className="ml-2 inline-block w-2 h-2 bg-green-600 rounded-full"></span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500">{formatDate(notification.createdAt)}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="p-2 hover:bg-gray-200 rounded-lg transition"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      
                      <p className="text-gray-700 mb-4">{notification.message}</p>
                      
                      {notification.actionType !== 'none' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(notification);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                        >
                          {notification.actionType === 'find_labour' && 'Find Workers'}
                          {notification.actionType === 'check_price' && 'Check Prices'}
                          {notification.actionType === 'view_details' && 'View Details'}
                          {notification.actionType === 'book_service' && 'Book Service'}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
