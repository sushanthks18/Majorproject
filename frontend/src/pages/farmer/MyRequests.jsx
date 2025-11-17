import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { Phone, Mail, MapPin, Calendar, FileText, X, CheckCircle, Clock } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { serviceLabels, formatDate, statusColors } from '../../utils/helpers';

const MyRequests = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [highlightId, setHighlightId] = useState(null);

  useEffect(() => {
    fetchRequests();
    
    // Highlight the most recent request when coming from notification
    if (location.state?.fromNotification) {
      setTimeout(() => {
        setHighlightId(requests[0]?.requestId);
        setTimeout(() => setHighlightId(null), 3000); // Remove highlight after 3 seconds
      }, 500);
    }
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get(`/requests/farmer/${user.id}`);
      setRequests(response.data.requests);
    } catch (error) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (requestId) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    
    try {
      await api.put(`/requests/${requestId}/cancel`);
      toast.success('Request cancelled');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel');
    }
  };

  const filteredRequests = requests.filter(req => 
    filter === 'all' || req.status === filter
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Labour Requests</h1>
          <p className="text-gray-600">Track and manage your service requests</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition capitalize ${
                filter === status
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading />
        ) : filteredRequests.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No requests found</h3>
              <p className="text-gray-600">You haven't made any labour requests yet</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request, index) => (
              <Card 
                key={request.requestId}
                className={`transition-all duration-300 ${
                  highlightId === request.requestId 
                    ? 'ring-4 ring-green-400 shadow-2xl scale-105' 
                    : ''
                } ${
                  index === 0 && filter === 'all' 
                    ? 'border-2 border-green-200' 
                    : ''
                }`}
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-800">{request.agentName}</h3>
                          {index === 0 && filter === 'all' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                              Latest
                            </span>
                          )}
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${statusColors[request.status]}`}>
                          {request.status === 'accepted' && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              ACCEPTED
                            </span>
                          )}
                          {request.status === 'pending' && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              PENDING
                            </span>
                          )}
                          {request.status !== 'accepted' && request.status !== 'pending' && request.status.toUpperCase()}
                        </span>
                      </div>
                      {request.status === 'pending' && (
                        <button
                          onClick={() => cancelRequest(request.requestId)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="font-semibold">{serviceLabels[request.service]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(request.preferredDate)}</span>
                      </div>
                      {request.status === 'accepted' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-green-600" />
                            <a href={`tel:${request.agentPhone}`} className="text-green-600 font-semibold hover:underline">
                              {request.agentPhone}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-green-600" />
                            <a href={`mailto:${request.agentEmail}`} className="text-green-600 hover:underline">
                              {request.agentEmail}
                            </a>
                          </div>
                        </>
                      )}
                    </div>

                    {request.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700"><span className="font-semibold">Notes:</span> {request.notes}</p>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-500">
                      Requested on {formatDate(request.createdAt)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRequests;
