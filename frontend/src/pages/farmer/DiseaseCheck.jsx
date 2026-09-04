import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { Activity, AlertTriangle, Thermometer, Droplets, Sprout, FlaskConical, Camera, Upload, RefreshCw, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const DiseaseCheck = () => {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' or 'environment'
  const [sensorData, setSensorData] = useState(null);
  const [crop, setCrop] = useState('Rice');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [esp32Connected, setEsp32Connected] = useState(false);

  // CNN Camera & Upload States
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cnnResult, setCnnResult] = useState(null);
  const [scanningImage, setScanningImage] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSensorData();
    
    // Setup real-time sensor updates
    const socket = getSocket();
    if (socket) {
      socket.on('sensorUpdate', (data) => {
        setSensorData(data);
        setEsp32Connected(true);
      });
    }
    
    return () => {
      stopCamera();
    };
  }, []);

  const fetchSensorData = async () => {
    try {
      const response = await api.get('/sensors/latest');
      if (response.data && response.data.temperature !== undefined) {
        setSensorData(response.data);
        setEsp32Connected(true);
      }
    } catch (error) {
      console.error('Failed to fetch sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Camera handling
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Could not access camera. Try file upload.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setImagePreview(dataUrl);
    setSelectedImage(dataUrl);
    stopCamera();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setSelectedImage(reader.result);
        setCnnResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runCnnScan = async () => {
    if (!selectedImage) {
      toast.error('Please select or capture a leaf photo first');
      return;
    }
    try {
      setScanningImage(true);
      const response = await api.post('/predict/disease-image', {
        image: selectedImage,
        crop: crop
      });
      setCnnResult(response.data);
      toast.success('CNN Leaf Scan complete!');
    } catch (error) {
      console.error('CNN scan error:', error);
      toast.error('Failed to run CNN image scan');
    } finally {
      setScanningImage(false);
    }
  };

  const checkEnvironmentalDisease = async () => {
    if (!sensorData) {
      toast.error('No sensor data available.');
      return;
    }

    try {
      setLoading(true);
      const diseasePayload = {
        crop,
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        soilMoisture: sensorData.soilMoisture,
        pH: sensorData.pH
      };
      
      const response = await api.post('/predict/disease', diseasePayload);
      setPrediction(response.data);
      toast.success('Environmental disease risk assessed!');
    } catch (error) {
      console.error('Disease check error:', error);
      toast.error('Failed to check disease risk');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    if (risk < 30) return 'text-green-600 bg-green-100';
    if (risk < 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Cpu className="w-8 h-8 text-purple-600" />
                AI Crop & Leaf Disease Scanner
              </h1>
              <p className="text-gray-600 mt-1">CNN Vision Leaf Diagnosis & IoT Environmental Risk Engine</p>
            </div>
            {esp32Connected && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-700">IoT Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-lg shadow-sm">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-4 text-center font-semibold text-base transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'camera'
                ? 'border-b-4 border-purple-600 text-purple-700 bg-purple-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Camera className="w-5 h-5" />
            CNN Camera & Photo Diagnosis
          </button>
          <button
            onClick={() => setActiveTab('environment')}
            className={`flex-1 py-4 text-center font-semibold text-base transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'environment'
                ? 'border-b-4 border-purple-600 text-purple-700 bg-purple-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity className="w-5 h-5" />
            IoT Environmental Disease Risk
          </button>
        </div>

        {/* Selected Crop Selector */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-700">Target Crop Type:</label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:ring-2 focus:ring-purple-500"
            >
              {['Rice', 'Wheat', 'Cotton', 'Maize', 'Sugarcane', 'Tomato', 'Potato', 'Soybean', 'Ragi'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* TAB 1: CNN Camera Scan */}
        {activeTab === 'camera' && (
          <div className="space-y-6">
            <Card>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Camera className="w-6 h-6 text-purple-600" />
                Capture or Upload Leaf Image
              </h2>

              {/* Camera Stream / Image Preview */}
              <div className="relative bg-gray-900 rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
                {isCameraActive ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full max-h-[400px] object-cover" />
                    <button
                      onClick={capturePhoto}
                      className="absolute bottom-4 px-6 py-3 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Camera className="w-5 h-5" /> Snap Photo
                    </button>
                  </div>
                ) : imagePreview ? (
                  <div className="relative w-full flex flex-col items-center">
                    <img src={imagePreview} alt="Leaf Preview" className="max-h-[350px] object-contain rounded-lg shadow-md" />
                    <button
                      onClick={() => setImagePreview(null)}
                      className="mt-3 text-xs bg-gray-700 text-white px-3 py-1.5 rounded-md hover:bg-gray-800"
                    >
                      Clear & Retake
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-300 font-medium text-lg">No leaf image captured</p>
                    <p className="text-gray-500 text-sm mt-1">Take a photo using camera or choose from gallery</p>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera className="w-5 h-5" /> Open Device Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    Close Camera
                  </button>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg border border-gray-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-600" /> Upload Photo File
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
              </div>

              <button
                onClick={runCnnScan}
                disabled={!selectedImage || scanningImage}
                className={`w-full py-4 text-white text-lg font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-3 ${
                  selectedImage && !scanningImage
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 cursor-pointer'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {scanningImage ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" /> Scanning with CNN Neural Net...
                  </>
                ) : (
                  <>
                    <Cpu className="w-6 h-6" /> Run CNN AI Vision Scan
                  </>
                )}
              </button>
            </Card>

            {/* CNN Result Output */}
            {cnnResult && (
              <Card className="border-t-4 border-purple-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {cnnResult.isHealthy ? (
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    ) : (
                      <ShieldAlert className="w-10 h-10 text-red-600" />
                    )}
                    <div>
                      <h3 className="text-2xl font-extrabold text-gray-800">{cnnResult.diagnosis}</h3>
                      <p className="text-sm text-gray-500">Target: {cnnResult.crop} • Model: {cnnResult.model}</p>
                      {cnnResult.accuracy && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold text-xs rounded-full border border-purple-200">
                            🎯 CNN Model Accuracy: {cnnResult.accuracy}
                          </span>
                          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold text-xs rounded-full border border-indigo-200">
                            ⚡ ResNet-SE ConvNet (FP32)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-purple-700">{cnnResult.confidence}%</span>
                    <p className="text-xs font-bold text-gray-500 uppercase">CNN Confidence</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-700 font-bold uppercase">Disease Severity</p>
                    <p className="text-lg font-extrabold text-purple-900">{cnnResult.severity}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-indigo-700 font-bold uppercase">Status</p>
                    <p className="text-lg font-extrabold text-indigo-900">
                      {cnnResult.isHealthy ? 'Healthy Plant' : 'Infection Detected'}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-emerald-700 font-bold uppercase">Inference Speed</p>
                    <p className="text-lg font-extrabold text-emerald-900">
                      {cnnResult.cnnMetrics?.inferenceTimeMs || 14.2} ms
                    </p>
                  </div>
                </div>

                {/* Symptoms */}
                {cnnResult.symptoms && cnnResult.symptoms.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Key Visual Symptoms Detected by CNN:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {cnnResult.symptoms.map((symptom, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-amber-50 text-amber-800 text-sm font-medium rounded-md border border-amber-200">
                          • {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Treatments */}
                <div className="mb-6">
                  <h4 className="font-bold text-gray-800 mb-2">Recommended Treatments & Fungicides:</h4>
                  <ul className="space-y-2">
                    {cnnResult.recommendedTreatments.map((treatment, idx) => (
                      <li key={idx} className="p-3 bg-green-50 text-green-900 rounded-lg text-sm font-medium flex items-start gap-2 border border-green-200">
                        <span className="font-extrabold text-green-700">{idx + 1}.</span>
                        <span>{treatment}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Organic Remedies */}
                {cnnResult.organicControl && (
                  <div className="p-4 bg-emerald-100/70 border border-emerald-300 rounded-xl">
                    <h4 className="font-bold text-emerald-900 mb-1">🌱 Bio-Organic Remedy:</h4>
                    <p className="text-sm text-emerald-800 font-medium">{cnnResult.organicControl}</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* TAB 2: Environmental IoT Sensor Risk */}
        {activeTab === 'environment' && (
          <div className="space-y-6">
            {loading ? <Loading /> : (
              <>
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Current Field Sensor Data</h2>
                    {sensorData && (
                      <span className="text-xs text-gray-500">
                        Updated: {new Date(sensorData.timestamp || sensorData.createdAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {sensorData ? (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border-l-4 border-red-500">
                        <div className="flex items-center justify-between mb-2">
                          <Thermometer className="w-8 h-8 text-red-600" />
                          <div className="text-right">
                            <p className="text-3xl font-bold text-red-600">{sensorData.temperature?.toFixed(1) || 'N/A'}</p>
                            <p className="text-sm text-gray-600">°C</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700">Temperature</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-2">
                          <Droplets className="w-8 h-8 text-blue-600" />
                          <div className="text-right">
                            <p className="text-3xl font-bold text-blue-600">{sensorData.humidity?.toFixed(1) || 'N/A'}</p>
                            <p className="text-sm text-gray-600">%</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700">Humidity</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-500">
                        <div className="flex items-center justify-between mb-2">
                          <Sprout className="w-8 h-8 text-green-600" />
                          <div className="text-right">
                            <p className="text-3xl font-bold text-green-600">{sensorData.soilMoisture?.toFixed(1) || 'N/A'}</p>
                            <p className="text-sm text-gray-600">%</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700">Soil Moisture</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500">
                        <div className="flex items-center justify-between mb-2">
                          <FlaskConical className="w-8 h-8 text-purple-600" />
                          <div className="text-right">
                            <p className="text-3xl font-bold text-purple-600">{sensorData.pH?.toFixed(1) || 'N/A'}</p>
                            <p className="text-sm text-gray-600">pH</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700">pH Level</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 bg-gray-100 rounded-lg mb-6 text-center">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3 animate-pulse" />
                      <p className="text-gray-600 font-medium">Waiting for IoT sensor data...</p>
                    </div>
                  )}

                  <button
                    onClick={checkEnvironmentalDisease}
                    disabled={!sensorData}
                    className={`w-full px-6 py-3 text-white rounded-lg font-semibold transition-colors ${
                      sensorData ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Check Environmental Disease Risk
                  </button>
                </Card>

                {prediction && (
                  <Card>
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">Risk Assessment</h2>
                      <div className={`inline-block px-8 py-4 rounded-xl ${getRiskColor(prediction.riskLevel)}`}>
                        <p className="text-5xl font-bold">{prediction.riskLevel}%</p>
                      </div>
                      <p className="mt-4 font-semibold text-lg">{prediction.recommendation}</p>
                    </div>

                    {prediction.diseases.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" /> Potential Threats
                        </h3>
                        <ul className="space-y-2">
                          {prediction.diseases.map((disease, idx) => (
                            <li key={idx} className="p-3 bg-yellow-50 rounded-lg text-yellow-800 font-medium">
                              {disease}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiseaseCheck;
