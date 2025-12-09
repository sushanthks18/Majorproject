import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Satellite, Calendar, Lock } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

function FieldsList() {
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching fields from API...');
      const response = await api.get('/fields');
      console.log('✅ Fields loaded:', response.data);
      setFields(response.data);
    } catch (error) {
      console.error('❌ Error loading fields:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // More specific error messages
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please check if backend is running.');
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Cannot connect to server. Please check if backend is running on port 5001.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to load fields');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">My Fields</h1>
            <p className="text-gray-600">Manage your fields and monitor crop health</p>
          </div>
          <button
            onClick={() => navigate('/farmer/register-field')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Field
          </button>
        </div>

        {/* Fields Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : fields.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No fields registered yet</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first field to the system</p>
            <button
              onClick={() => navigate('/farmer/register-field')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Register Field
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fields.map(field => (
              <div
                key={field._id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/farmer/satellite-monitoring/${field._id}`)}
              >
                <div className="h-2 bg-gradient-to-r from-green-400 to-blue-500"></div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{field.name}</h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{field.areaHectares} hectares</span>
                    </div>
                    {field.cropType && (
                      <div className="flex items-center gap-2">
                        <span>🌾</span>
                        <span>{field.cropType}</span>
                      </div>
                    )}
                    {field.isCropLocked && (
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600 font-medium">Locked: {field.lockedCrop}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Registered: {new Date(field.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/farmer/satellite-monitoring/${field._id}`);
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center gap-1"
                    >
                      <Satellite className="w-4 h-4" />
                      Monitor
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/farmer/irrigation/${field._id}`);
                      }}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Irrigation
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FieldsList;