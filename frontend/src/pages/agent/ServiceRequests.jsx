import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { Phone, Mail, MapPin, Check, X, Calendar, FileText } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { serviceLabels, formatDate, statusColors } from '../../utils/helpers';

const ServiceRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get(`/requests/agent/${user.id}`);
      setRequests(response.data.requests);
    } catch (error) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      await api.put(`/requests/${requestId}/status`, { status });
      toast.success(`Request ${status}!`);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update request');
    }
  };

  const getDirections = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const filteredRequests = requests.filter(req => 
    filter === 'all' || req.status === filter
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="agent" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Service Requests</h1>
          <p className="text-gray-600">Manage incoming labour service requests</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'pending', 'accepted', 'completed', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition capitalize ${
                filter === status
                  ? 'bg-blue-600 text-white'
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
              <p className="text-gray-600">You don't have any {filter !== 'all' ? filter : ''} requests yet</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.requestId}>
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{request.farmerName}</h3>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${statusColors[request.status]}`}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span className="font-semibold">{serviceLabels[request.service]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(request.preferredDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <a href={`tel:${request.farmerPhone}`} className="text-blue-600 font-semibold hover:underline">
                          {request.farmerPhone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <a href={`mailto:${request.farmerEmail}`} className="text-blue-600 hover:underline text-sm">
                          {request.farmerEmail}
                        </a>
                      </div>
                    </div>

                    {request.farmLocation && (
                      <div className="mb-4">
                        <button
                          onClick={() => getDirections(request.farmLocation.lat, request.farmLocation.lng)}
                          className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                        >
                          <MapPin className="w-4 h-4" />
                          Get Directions to Farm
                        </button>
                      </div>
                    )}

                    {request.notes && (
                      <div className="p-3 bg-blue-50 rounded-lg mb-4">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Notes:</span> {request.notes}
                        </p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => updateRequestStatus(request.requestId, 'accepted')}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
                        >
                          <Check className="w-5 h-5" />
                          Accept
                        </button>
                        <button
                          onClick={() => updateRequestStatus(request.requestId, 'rejected')}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2"
                        >
                          <X className="w-5 h-5" />
                          Reject
                        </button>
                      </div>
                    )}

                    {request.status === 'accepted' && (
                      <button
                        onClick={() => updateRequestStatus(request.requestId, 'completed')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                      >
                        Mark as Completed
                      </button>
                    )}
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

export default ServiceRequests;
