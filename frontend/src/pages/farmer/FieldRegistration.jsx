import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Circle, Map as MapIcon } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

function FieldRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [registrationType, setRegistrationType] = useState('gps');
  
  // Field data
  const [fieldName, setFieldName] = useState('');
  const [centerLat, setCenterLat] = useState('');
  const [centerLng, setCenterLng] = useState('');
  const [radius, setRadius] = useState('');
  const [cropType, setCropType] = useState('');
  const [soilType, setSoilType] = useState('');
  
  // Survey/Registration number data
  const [state, setState] = useState('Karnataka');
  const [district, setDistrict] = useState('');
  const [taluk, setTaluk] = useState('');
  const [village, setVillage] = useState('');
  const [surveyNumber, setSurveyNumber] = useState('');
  const [fetchingLandData, setFetchingLandData] = useState(false);
  const [detectingSoil, setDetectingSoil] = useState(false);
  
  // Polygon coordinates
  const [polygonCoords, setPolygonCoords] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Common soil types in India
  const soilTypes = [
    'Alluvial Soil',
    'Black Soil (Regur)',
    'Red Soil',
    'Laterite Soil',
    'Desert Soil',
    'Mountain Soil',
    'Clay Loam',
    'Sandy Loam',
    'Clay',
    'Sandy',
    'Loamy'
  ];

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenterLat(position.coords.latitude.toFixed(6));
        setCenterLng(position.coords.longitude.toFixed(6));
        toast.success('Location captured!');
        setLoading(false);
      },
      (error) => {
        toast.error('Failed to get location');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleFetchLandRecords = async () => {
    if (!surveyNumber) {
      toast.error('Please enter survey/registration number');
      return;
    }

    try {
      setFetchingLandData(true);
      toast.loading('Fetching land records...', { id: 'fetch-land' });

      const response = await api.post('/fields/fetch-land-records', {
        state,
        district,
        taluk,
        village,
        surveyNumber
      });

      if (response.data.success) {
        // Set field data from government records
        setFieldName(response.data.fieldName || `Survey ${surveyNumber}`);
        setPolygonCoords(JSON.stringify(response.data.boundary));
        setSoilType(response.data.soilType || '');
        
        toast.success('Land records fetched successfully!', { id: 'fetch-land' });
        toast.success(`Area: ${response.data.area} hectares`);
        
        // Auto-register and navigate to satellite view
        setTimeout(() => {
          handleAutoRegister(response.data);
        }, 1000);
      }
    } catch (error) {
      console.error('Error fetching land records:', error);
      toast.error(
        error.response?.data?.message || 
        'Failed to fetch land records. You can enter boundary manually.',
        { id: 'fetch-land', duration: 5000 }
      );
    } finally {
      setFetchingLandData(false);
    }
  };

  const handleAutoRegister = async (landData) => {
    try {
      setLoading(true);
      
      const coords = landData.boundary;
      const ring = coords[0];
      if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
        ring.push(ring[0]);
      }
      
      const response = await api.post('/fields/register-by-survey', {
        name: landData.fieldName || `Survey ${surveyNumber}`,
        coordinates: coords,
        state,
        district,
        taluk,
        village,
        surveyNumber,
        cropType,
        soilType: landData.soilType
      });
      
      toast.success('Field registered! Redirecting to satellite view...');
      
      // Navigate to satellite monitoring
      setTimeout(() => {
        navigate(`/farmer/satellite-monitoring/${response.data.fieldId}`);
      }, 1000);
      
    } catch (error) {
      console.error('Error auto-registering field:', error);
      toast.error('Failed to register field automatically');
      setLoading(false);
    }
  };

  const handleDetectSoilType = async () => {
    if (!centerLat || !centerLng) {
      toast.error('Please capture location first');
      return;
    }

    try {
      setDetectingSoil(true);
      toast.loading('Detecting soil type...', { id: 'detect-soil' });

      const response = await api.post('/fields/detect-soil-type', {
        latitude: parseFloat(centerLat),
        longitude: parseFloat(centerLng)
      });

      if (response.data.soilType) {
        setSoilType(response.data.soilType);
        toast.success(`Detected: ${response.data.soilType}`, { id: 'detect-soil' });
        if (response.data.characteristics) {
          toast.success(response.data.characteristics, { duration: 5000 });
        }
      }
    } catch (error) {
      console.error('Error detecting soil:', error);
      toast.error('Failed to detect soil type. Please select manually.', { id: 'detect-soil' });
    } finally {
      setDetectingSoil(false);
    }
  };

  const handleRegisterField = async () => {
    try {
      if (!fieldName) {
        toast.error('Please enter field name');
        return;
      }

      setLoading(true);

      let response;
      
      if (registrationType === 'survey') {
        // Register using survey number with fetched boundary
        if (!polygonCoords) {
          toast.error('Please fetch land records first');
          setLoading(false);
          return;
        }

        const coords = JSON.parse(polygonCoords);
        
        response = await api.post('/fields/register-by-survey', {
          name: fieldName,
          coordinates: coords,
          state,
          district,
          taluk,
          village,
          surveyNumber,
          cropType,
          soilType
        });
      } else if (registrationType === 'gps') {
        if (!centerLat || !centerLng || !radius) {
          toast.error('Please fill all GPS fields');
          setLoading(false);
          return;
        }

        response = await api.post('/fields/register-by-coordinates', {
          name: fieldName,
          centerLat: parseFloat(centerLat),
          centerLng: parseFloat(centerLng),
          radiusMeters: parseFloat(radius),
          cropType,
          soilType
        });
      } else if (registrationType === 'polygon') {
        if (!polygonCoords) {
          toast.error('Please enter polygon coordinates');
          setLoading(false);
          return;
        }

        // Parse polygon coordinates
        const coords = JSON.parse(polygonCoords);
        
        response = await api.post('/fields/register-by-polygon', {
          name: fieldName,
          coordinates: coords,
          cropType,
          soilType
        });
      }

      toast.success(`Field registered successfully! Area: ${response.data.areaHectares} hectares`);
      
      // Navigate to satellite monitoring
      navigate(`/farmer/satellite-monitoring/${response.data.fieldId}`);
      
    } catch (error) {
      console.error('Error registering field:', error);
      toast.error(error.response?.data?.error || 'Failed to register field');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Register Your Field</h1>
          <p className="text-gray-600">Add your field to get satellite-based crop monitoring and smart sensor placement recommendations</p>
        </div>

        {/* Step 1: Registration Type */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Step 1: Choose Registration Method</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              {/* Survey Number Method */}
              <button
                onClick={() => setRegistrationType('survey')}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  registrationType === 'survey'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <MapIcon className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Survey/Reg Number</h3>
                    <p className="text-sm text-gray-600">Fetch from government land records</p>
                  </div>
                </div>
              </button>

              {/* GPS Method */}
              <button
                onClick={() => setRegistrationType('gps')}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  registrationType === 'gps'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Circle className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">GPS Coordinates</h3>
                    <p className="text-sm text-gray-600">Define field using center point and radius</p>
                  </div>
                </div>
              </button>

              {/* Polygon Method */}
              <button
                onClick={() => setRegistrationType('polygon')}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  registrationType === 'polygon'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <MapIcon className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Manual Polygon</h3>
                    <p className="text-sm text-gray-600">Enter corner coordinates manually</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep(2)}
              className="mt-6 w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Field Details */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Step 2: Field Details</h2>

            {/* Field Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Field Name *</label>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g., North Paddy Field"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Survey Number Fields */}
            {registrationType === 'survey' && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 font-semibold mb-2">📋 Automatic Field Detection</p>
                  <p className="text-xs text-blue-700">Enter your survey/registration number to automatically fetch field boundary and view satellite map</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Karnataka">Karnataka</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Telangana">Telangana</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g., Tumkur (optional)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Survey/Registration Number *</label>
                  <input
                    type="text"
                    value={surveyNumber}
                    onChange={(e) => setSurveyNumber(e.target.value)}
                    placeholder="e.g., 123/4A or ROR-2023-456"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Just enter your registration number - everything else is automatic!
                  </p>
                </div>

                <button
                  onClick={handleFetchLandRecords}
                  disabled={fetchingLandData || !surveyNumber || loading}
                  className="mb-4 w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold text-lg flex items-center justify-center gap-2 shadow-lg"
                >
                  {fetchingLandData || loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      {loading ? 'Registering field...' : 'Fetching field details...'}
                    </>
                  ) : (
                    <>
                      <MapPin className="w-5 h-5" />
                      View Field on Satellite Map
                    </>
                  )}
                </button>

                {polygonCoords && !loading && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800 font-semibold mb-1">✅ Field Found!</p>
                    <p className="text-xs text-green-700">Redirecting to satellite view...</p>
                  </div>
                )}
              </>
            )}

            {/* GPS Fields */}
            {registrationType === 'gps' && (
              <>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Center Latitude *</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={centerLat}
                      onChange={(e) => setCenterLat(e.target.value)}
                      placeholder="13.3379"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Center Longitude *</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={centerLng}
                      onChange={(e) => setCenterLng(e.target.value)}
                      placeholder="77.1006"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Field Radius (meters) *</label>
                  <input
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <button
                  onClick={handleGetCurrentLocation}
                  disabled={loading}
                  className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  {loading ? 'Getting Location...' : 'Use Current Location'}
                </button>
              </>
            )}

            {/* Polygon Fields */}
            {registrationType === 'polygon' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Polygon Coordinates (GeoJSON format) *
                </label>
                <textarea
                  value={polygonCoords}
                  onChange={(e) => setPolygonCoords(e.target.value)}
                  placeholder='[[[77.1, 13.3], [77.2, 13.3], [77.2, 13.4], [77.1, 13.4], [77.1, 13.3]]]'
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter coordinates as: [[[lng1, lat1], [lng2, lat2], ...]]
                </p>
              </div>
            )}

            {/* Optional Fields */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Crop Type</label>
                <input
                  type="text"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder="e.g., Rice, Wheat"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Soil Type
                  {registrationType === 'gps' && centerLat && centerLng && (
                    <button
                      onClick={handleDetectSoilType}
                      disabled={detectingSoil}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      {detectingSoil ? 'Detecting...' : 'Auto-Detect'}
                    </button>
                  )}
                </label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select soil type</option>
                  {soilTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Not sure? Use "Auto-Detect" or leave blank
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleRegisterField}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Registering...' : 'Register Field'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FieldRegistration;
