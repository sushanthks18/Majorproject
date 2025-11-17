import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import Loading from '../../components/Loading';
import { Search, MapPin, Star, Phone, Mail, Briefcase, Users, DollarSign, Filter } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { serviceLabels, formatCurrency } from '../../utils/helpers';

const FindLabour = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchService, setSearchService] = useState('');
  const [radius, setRadius] = useState(50);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    service: '',
    preferredDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchNearbyAgents();
  }, [radius]);

  const fetchNearbyAgents = async () => {
    try {
      setLoading(true);
      const { lat, lng } = user.location;
      const params = { lat, lng, radius };
      if (searchService) {
        params.service = searchService;
      }
      
      const response = await api.get('/agents/nearby', { params });
      setAgents(response.data.agents);
    } catch (error) {
      toast.error('Failed to fetch agents');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestService = (agent) => {
    setSelectedAgent(agent);
    setRequestForm({
      service: agent.services[0] || '',
      preferredDate: '',
      notes: ''
    });
    setShowRequestModal(true);
  };

  const submitRequest = async () => {
    try {
      if (!requestForm.service || !requestForm.preferredDate) {
        toast.error('Please fill all required fields');
        return;
      }

      await api.post('/requests/create', {
        agentId: selectedAgent.userId,
        service: requestForm.service,
        preferredDate: requestForm.preferredDate,
        notes: requestForm.notes,
        farmLocation: user.location
      });

      toast.success('Service request sent successfully!');
      setShowRequestModal(false);
      setRequestForm({ service: '', preferredDate: '', notes: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send request');
    }
  };

  const getDirections = (agent) => {
    setSelectedAgent(agent);
    setShowLocationModal(true);
  };

  const openGoogleMaps = (lat, lng) => {
    if (lat === 0 && lng === 0) {
      toast.error('Location not available for this agent');
      return;
    }
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Find Labour Agents</h1>
          <p className="text-gray-600">Search for skilled agricultural workers near you</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="inline w-4 h-4 mr-1" />
                Service Type
              </label>
              <select
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Services</option>
                {Object.entries(serviceLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                Search Radius: {radius} km
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 km</span>
                <span>100 km</span>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchNearbyAgents}
                className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                <Search className="inline w-4 h-4 mr-2" />
                Search
              </button>
            </div>
          </div>
        </Card>

        {/* Results */}
        {loading ? (
          <Loading message="Finding nearby agents..." />
        ) : agents.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No agents found</h3>
              <p className="text-gray-600">Try increasing the search radius or changing filters</p>
            </div>
          </Card>
        ) : (
          <div>
            <div className="mb-4">
              <p className="text-gray-600">
                Found <span className="font-semibold text-green-600">{agents.length}</span> agents within {radius} km
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <Card key={agent.agentId} className="hover:shadow-xl transition">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{agent.name}</h3>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-semibold">{agent.rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-500">({agent.totalRatings})</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{agent.distance} km away</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Briefcase className="w-4 h-4" />
                      <span>{agent.experience} years experience</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{agent.laborCount} workers</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatCurrency(agent.hourlyRate)}/hour</span>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Services:</p>
                    <div className="flex flex-wrap gap-2">
                      {agent.services.map((service) => (
                        <span
                          key={service}
                          className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium"
                        >
                          {serviceLabels[service]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      agent.availability === 'available' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        agent.availability === 'available' ? 'bg-green-600' : 'bg-gray-600'
                      }`} />
                      {agent.availability === 'available' ? 'Available' : 'Busy'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestService(agent)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                    >
                      Request Service
                    </button>
                    <button
                      onClick={() => window.open(`tel:${agent.phone}`)}
                      className="p-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => getDirections(agent)}
                      className="p-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition"
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Request Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Request Labour Service"
      >
        {selectedAgent && (
          <div>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">{selectedAgent.name}</h3>
              <p className="text-sm text-gray-600">
                {selectedAgent.distance} km away • {formatCurrency(selectedAgent.hourlyRate)}/hour
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Required *
                </label>
                <select
                  value={requestForm.service}
                  onChange={(e) => setRequestForm({ ...requestForm, service: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a service</option>
                  {selectedAgent.services.map((service) => (
                    <option key={service} value={service}>
                      {serviceLabels[service]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={requestForm.preferredDate}
                  onChange={(e) => setRequestForm({ ...requestForm, preferredDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes / Special Requirements
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="4"
                  placeholder="Any specific requirements or instructions..."
                />
              </div>

              <button
                onClick={submitRequest}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Send Request
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Location Modal */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="Agent Location"
      >
        {selectedAgent && (
          <div>
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">{selectedAgent.name}</h3>
              
              {/* Location Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Distance from you</p>
                    <p className="text-sm text-gray-800">{selectedAgent.distance} km away</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Coordinates</p>
                    <p className="text-sm text-gray-800 font-mono">
                      {selectedAgent.location.lat === 0 && selectedAgent.location.lng === 0 
                        ? 'Location not set' 
                        : `${selectedAgent.location.lat.toFixed(6)}, ${selectedAgent.location.lng.toFixed(6)}`
                      }
                    </p>
                  </div>

                  {selectedAgent.location.address && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Address</p>
                      <p className="text-sm text-gray-800">{selectedAgent.location.address}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Contact</p>
                    <p className="text-sm text-gray-800">
                      <Phone className="w-3 h-3 inline mr-1" />
                      {selectedAgent.phone}
                    </p>
                    <p className="text-sm text-gray-800">
                      <Mail className="w-3 h-3 inline mr-1" />
                      {selectedAgent.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Map Preview */}
              {selectedAgent.location.lat !== 0 && selectedAgent.location.lng !== 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Map Preview</p>
                  <div className="relative w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
                    <iframe
                      title="Location Map"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps?q=${selectedAgent.location.lat},${selectedAgent.location.lng}&output=embed`}
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => openGoogleMaps(selectedAgent.location.lat, selectedAgent.location.lng)}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
                  disabled={selectedAgent.location.lat === 0 && selectedAgent.location.lng === 0}
                >
                  <MapPin className="w-5 h-5" />
                  Open in Google Maps
                </button>
                <button
                  onClick={() => window.open(`tel:${selectedAgent.phone}`)}
                  className="px-4 py-3 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition font-semibold flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  Call
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FindLabour;
