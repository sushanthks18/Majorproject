import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { StatCard } from '../../components/Card';
import { Briefcase, CheckCircle, DollarSign, Clock, FileText } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';
import Loading from '../../components/Loading';

const AgentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalEarnings: 0
  });
  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    fetchStats();
    setupRealtimeUpdates();
  }, []);

  const fetchStats = async () => {
    try {
      const [requestsRes, profileRes] = await Promise.all([
        api.get(`/requests/agent/${user.id}`),
        api.get('/agents/my-profile')
      ]);

      const requests = requestsRes.data.requests;
      setRecentRequests(requests.slice(0, 5));
      
      setStats({
        totalRequests: requests.length,
        activeJobs: requests.filter(r => r.status === 'accepted').length,
        completedJobs: profileRes.data.completedJobs || 0,
        totalEarnings: profileRes.data.totalEarnings || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeUpdates = () => {
    const socket = getSocket();
    if (socket) {
      socket.on('newRequest', (data) => {
        toast.success(`New service request from ${data.farmerName}!`, { duration: 5000 });
        fetchStats();
      });
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
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-2">Manage your labour services and requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={FileText}
            label="Total Requests"
            value={stats.totalRequests}
            color="blue"
          />
          <StatCard
            icon={Briefcase}
            label="Active Jobs"
            value={stats.activeJobs}
            color="yellow"
          />
          <StatCard
            icon={CheckCircle}
            label="Completed Jobs"
            value={stats.completedJobs}
            color="green"
          />
          <StatCard
            icon={DollarSign}
            label="Total Earnings"
            value={`₹${stats.totalEarnings.toLocaleString()}`}
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/agent/requests')}
              className="p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex flex-col items-center gap-3"
            >
              <FileText className="w-8 h-8" />
              <span className="font-semibold">View Requests</span>
            </button>
            
            <button
              onClick={() => navigate('/agent/active-jobs')}
              className="p-6 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex flex-col items-center gap-3"
            >
              <Briefcase className="w-8 h-8" />
              <span className="font-semibold">Active Jobs</span>
            </button>
            
            <button
              onClick={() => navigate('/agent/profile')}
              className="p-6 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex flex-col items-center gap-3"
            >
              <Clock className="w-8 h-8" />
              <span className="font-semibold">Update Profile</span>
            </button>
          </div>
        </div>

        {/* Recent Requests */}
        {recentRequests.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Requests</h2>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentRequests.map((req) => (
                    <tr key={req.requestId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{req.farmerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">{req.service}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(req.preferredDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          req.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                          req.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
