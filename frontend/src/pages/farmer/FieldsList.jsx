import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Satellite, Calendar } from 'lucide-react';
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
      const response = await api.get('/fields');
      setFields(response.data);
    } catch (error) {
      console.error('Error loading fields:', error);
      toast.error('Failed to load fields');
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
            <Plus className="w-4 h-4" />
            Register New Field
          </button>
        </div>

        {/* Fields Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading fields...</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Fields Registered</h3>
            <p className="text-gray-600 mb-6">
              Register your first field to start satellite-based monitoring
            </p>
            <button
              onClick={() => navigate('/farmer/register-field')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Register Field
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fields.map((field) => (
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
                      className="flex-1 text-green-600 hover:bg-green-50 border border-green-600 rounded-lg py-2 px-3 flex items-center justify-center gap-1 text-xs font-semibold transition"
                    >
                      <Satellite className="w-4 h-4" />
                      Satellite
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/farmer/irrigation/${field._id}`);
                      }}
                      className="flex-1 text-blue-600 hover:bg-blue-50 border border-blue-600 rounded-lg py-2 px-3 flex items-center justify-center gap-1 text-xs font-semibold transition"
                    >
                      💧
                      Irrigation
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/farmer/fertilizer/${field._id}`);
                      }}
                      className="flex-1 text-amber-600 hover:bg-amber-50 border border-amber-600 rounded-lg py-2 px-3 flex items-center justify-center gap-1 text-xs font-semibold transition"
                    >
                      🌱
                      Fertilizer
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
