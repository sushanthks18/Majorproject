import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import Card from '../../components/Card';
import Loading from '../../components/Loading';
import { Activity, AlertTriangle, Thermometer, Droplets, Sprout, Camera, Upload, RefreshCw, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const DiseaseCheck = () => {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' or 'environment'
  const [sensorData, setSensorData] = useState(null);
  const [envCrop, setEnvCrop] = useState('Rice');
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
        image: selectedImage
      });
      setCnnResult(response.data);
      if (response.data.status === 'invalid_image') {
        toast.error('Invalid Image: Please upload a clear photograph of a crop leaf.');
      } else if (response.data.status === 'uncertain') {
        toast('Unable to identify the disease reliably. Please upload another clear leaf photograph.', { icon: '⚠️' });
      } else if (response.data.status === 'unsupported') {
        toast('Disease detection for this crop is not supported yet.', { icon: 'ℹ️' });
      } else {
        toast.success(`Identified ${response.data.crop || 'Crop'}: ${response.data.diagnosis}`);
      }
    } catch (error) {
      console.error('MobileNetV2 scan error:', error);
      const errorData = error.response?.data;
      if (errorData?.status === 'invalid_image') {
        setCnnResult(errorData);
      }
      const errorMsg = errorData?.message || errorData?.error || 'Invalid Image: Please upload a clear photograph of a crop leaf.';
      toast.error(errorMsg);
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
        crop: envCrop,
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        soilMoisture: sensorData.soilMoisture
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
              <p className="text-gray-600 mt-1">MobileNetV2 Vision Leaf Diagnosis & IoT Environmental Risk Engine</p>
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
            MobileNetV2 Camera & Photo Diagnosis
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

        {/* TAB 1: CNN Camera Scan */}
        {activeTab === 'camera' && (
          <div className="space-y-6">
            {/* AI Leaf Photography Guidance Card */}
            <Card className="bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-green-50/90 border border-emerald-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-emerald-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Sprout className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-emerald-950 text-base">AI Leaf Photography Guidance</h3>
                    <p className="text-xs text-emerald-700">Follow these guidelines for automatic crop identification & leaf disease diagnosis</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                  🌿 Multi-Crop AI Scanner
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Instructions List */}
                <div className="md:col-span-7">
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Hold the camera approximately <strong>6–8 inches</strong> from the leaf surface.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Capture the <strong>complete affected portion</strong> of the leaf.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Keep <strong>brown lesions and surrounding healthy tissue</strong> visible.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Use <strong>natural lighting</strong> and avoid harsh shadows or glare.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Keep the camera <strong>steady and focus clearly</strong> on the leaf.</span>
                    </li>
                  </ul>
                  <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase">Supported Crops:</span>
                    {['Rice', 'Wheat', 'Tomato', 'Potato', 'Maize (Corn)', 'Cotton'].map((c) => (
                      <span key={c} className="text-[11px] px-2 py-0.5 bg-white/80 text-emerald-800 font-semibold rounded-full border border-emerald-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visual Guide: Leaf Framing */}
                <div className="md:col-span-5 bg-white/90 p-3 rounded-xl border border-emerald-200/80 shadow-inner flex flex-col items-center">
                  <div className="w-full text-[11px] font-bold text-emerald-900 uppercase tracking-wide text-center mb-1 flex items-center justify-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    Visual Guide: Leaf Framing
                  </div>
                  <div className="w-full max-w-[220px] aspect-[16/10] bg-emerald-950/5 rounded-lg overflow-hidden border border-emerald-200 flex items-center justify-center relative p-1">
                    <svg viewBox="0 0 200 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Background subtle grid */}
                      <rect width="200" height="120" fill="#f0fdf4" rx="4" />
                      <line x1="0" y1="60" x2="200" y2="60" stroke="#dcfce7" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="100" y1="0" x2="100" y2="120" stroke="#dcfce7" strokeWidth="1" strokeDasharray="3 3" />

                      {/* Leaf Blade passing diagonally through camera viewport */}
                      <path
                        d="M 25 115 C 60 85, 95 65, 175 10 C 160 35, 125 75, 85 118 Z"
                        fill="#4ade80"
                        stroke="#15803d"
                        strokeWidth="1.5"
                      />
                      {/* Leaf Central Vein (Midrib) */}
                      <path
                        d="M 50 117 C 88 80, 115 52, 170 12"
                        stroke="#bbf7d0"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />

                      {/* Lesion on leaf blade with necrotic center & chlorotic halo */}
                      <ellipse cx="112" cy="62" rx="15" ry="7" transform="rotate(-36 112 62)" fill="#92400e" opacity="0.9" />
                      <ellipse cx="112" cy="62" rx="10" ry="4.5" transform="rotate(-36 112 62)" fill="#d97706" />
                      <ellipse cx="112" cy="62" rx="5" ry="2" transform="rotate(-36 112 62)" fill="#fef3c7" />

                      {/* Viewfinder Target / Framing Box */}
                      <rect x="35" y="15" width="130" height="90" rx="6" stroke="#059669" strokeWidth="1.5" strokeDasharray="5 3" />
                      
                      {/* Corner Focus Brackets */}
                      <path d="M 40 25 L 40 20 L 45 20" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
                      <path d="M 160 25 L 160 20 L 155 20" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
                      <path d="M 40 95 L 40 100 L 45 100" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
                      <path d="M 160 95 L 160 100 L 155 100" stroke="#047857" strokeWidth="2" strokeLinecap="round" />

                      {/* Annotation Callout */}
                      <rect x="110" y="24" width="76" height="15" rx="3" fill="#047857" />
                      <text x="148" y="35" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                        Lesion + Margin
                      </text>

                      {/* Distance Badge */}
                      <rect x="42" y="86" width="68" height="14" rx="3" fill="#065f46" />
                      <text x="76" y="96.5" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                        ✓ 6–8 in. Distance
                      </text>
                    </svg>
                  </div>
                  <span className="text-[10.5px] text-emerald-800 text-center font-medium mt-1.5 leading-tight">
                    Center the lesion with visible leaf border
                  </span>
                </div>
              </div>
            </Card>

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
                    <RefreshCw className="w-6 h-6 animate-spin" /> Scanning with MobileNetV2 Deep Neural Net...
                  </>
                ) : (
                  <>
                    <Cpu className="w-6 h-6" /> Run MobileNetV2 Vision Scan
                  </>
                )}
              </button>
            </Card>

            {/* MobileNetV2 Result Output */}
            {cnnResult && (
              cnnResult.status === 'invalid_image' ? (
                <Card className="border-t-4 border-red-500 bg-red-50/30">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-xl text-red-700 flex-shrink-0">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-3 py-1 bg-red-200 text-red-900 font-extrabold text-xs rounded-full">
                          IMAGE VALIDATION REJECTED
                        </span>
                      </div>
                      <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
                        Invalid Image: Please upload a clear photograph of a crop leaf.
                      </h3>
                      <p className="text-gray-700 text-sm leading-relaxed mb-4">
                        {cnnResult.reason || 'The uploaded file does not contain an identifiable, clear plant leaf photograph. Non-leaf objects, QR codes, documents, screenshots, and severely degraded photos cannot be evaluated.'}
                      </p>
                      <div className="p-3.5 bg-white rounded-lg border border-red-200 text-xs text-gray-600">
                        <strong className="text-gray-800">📸 Quality Guidelines:</strong>
                        <ul className="mt-1 list-disc list-inside space-y-1">
                          <li>Hold camera 6–12 inches from the crop leaf blade under natural daylight.</li>
                          <li>Ensure the leaf is well-focused without severe blur or motion shake.</li>
                          <li>Avoid capturing non-plant objects, barcodes, paper documents, or screens.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : cnnResult.status === 'uncertain' ? (
                <Card className="border-t-4 border-amber-500 bg-amber-50/30">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl text-amber-700 flex-shrink-0">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-3 py-1 bg-amber-200 text-amber-900 font-extrabold text-xs rounded-full">
                          {cnnResult.diagnosis === 'Uncertain / Unsupported Crop' ? 'UNSUPPORTED CROP / UNCERTAIN' : 'UNCERTAIN DIAGNOSIS (< 70% CONFIDENCE)'}
                        </span>
                        {cnnResult.crop && cnnResult.crop !== 'Unsupported Crop' && (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-xs rounded-full border border-amber-200">
                            Closest Crop: {cnnResult.crop}
                          </span>
                        )}
                        {cnnResult.confidence && (
                          <span className="text-xs text-gray-500 font-semibold">Model Confidence: {cnnResult.confidence}%</span>
                        )}
                      </div>
                      <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
                        {cnnResult.message || 'Unable to identify the disease reliably. Please upload another clear leaf photograph.'}
                      </h3>
                      <p className="text-gray-700 text-sm leading-relaxed mb-4">
                        {cnnResult.diagnosis === 'Uncertain / Unsupported Crop'
                          ? 'This leaf photograph does not match any of the 6 supported crops (Rice, Wheat, Tomato, Potato, Corn, Cotton). To prevent crop damage and hazardous misapplication of chemical inputs, confirmed disease diagnoses and chemical sprays are strictly withheld.'
                          : 'The visual features in this photo do not match any known disease class with high confidence. To prevent incorrect diagnoses and hazardous chemical applications, confirmed disease classifications and treatments are withheld.'}
                      </p>
                      {cnnResult.topPredictions && cnnResult.topPredictions.length > 0 && (
                        <div className="p-4 bg-white rounded-lg border border-amber-200 mb-4">
                          <h4 className="font-bold text-gray-700 text-xs uppercase mb-2">Low-Confidence Candidates (Informational Reference Only):</h4>
                          <div className="space-y-1.5">
                            {cnnResult.topPredictions.map((pred, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-gray-600">
                                <span>{pred.disease} ({pred.crop})</span>
                                <span className="font-bold text-amber-700">{pred.confidence}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="p-3 bg-amber-100/60 rounded-lg text-xs text-amber-900">
                        <strong>Advisory:</strong> Do not spray chemical fungicides based on uncertain predictions. Please re-take a steady photograph in natural lighting or consult an agricultural extension specialist.
                      </div>
                    </div>
                  </div>
                </Card>
              ) : cnnResult.status === 'unsupported' ? (
                <Card className="border-t-4 border-amber-500 bg-amber-50/30">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl text-amber-700 flex-shrink-0">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-3 py-1 bg-amber-200 text-amber-900 font-extrabold text-xs rounded-full">
                          NOT SUPPORTED YET
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">{cnnResult.crop}</span>
                      </div>
                      <h3 className="text-2xl font-extrabold text-gray-900 mb-2">
                        Disease detection for this crop is not supported yet.
                      </h3>
                      <p className="text-gray-700 text-sm leading-relaxed mb-4">
                        Krishi Sakha currently supports 17 validated disease classes across Tomato, Potato, Rice, Wheat, Corn/Maize, and Cotton. Verified open-access training data for {cnnResult.crop} has not yet been integrated into the active model head.
                      </p>

                      <div className="p-4 bg-white rounded-lg border border-amber-200 mb-4">
                        <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                          🏛️ Official Agronomic Guidance:
                        </h4>
                        <ul className="space-y-1.5">
                          {cnnResult.recommendedTreatments?.map((rec, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="font-bold text-amber-600">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="text-xs text-gray-500 italic">
                        Model: {cnnResult.model} • 17 supported classes • {cnnResult.crop} disease screening pending verified field collection.
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="border-t-4 border-purple-600">
                  {/* Crop Mismatch Advisory Banner */}
                  {cnnResult.cropMismatch && (
                    <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-800 uppercase">Crop Mismatch Advisory</p>
                        <p className="text-sm text-amber-800">{cnnResult.cropMismatchWarning}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {cnnResult.isHealthy ? (
                        <CheckCircle2 className="w-10 h-10 text-green-600 flex-shrink-0" />
                      ) : (
                        <ShieldAlert className="w-10 h-10 text-red-600 flex-shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-sm rounded-full border border-emerald-300 inline-flex items-center gap-1.5 shadow-sm">
                            <Sprout className="w-4 h-4 text-emerald-700" />
                            Detected Crop: {cnnResult.crop || cnnResult.detectedCrop}
                          </span>
                          <span className={`px-2.5 py-0.5 font-bold text-xs rounded-full border ${
                            cnnResult.isHealthy 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-red-100 text-red-800 border-red-200'
                          }`}>
                            {cnnResult.isHealthy ? 'Healthy Leaf' : 'Diseased Leaf'}
                          </span>
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-800">{cnnResult.diagnosis}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Autonomous AI Identification • Model: {cnnResult.model || 'MobileNetV2'}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          {cnnResult.accuracy && (
                            <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold text-xs rounded-full border border-purple-200">
                              🎯 Benchmark Accuracy: {cnnResult.accuracy}
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold text-xs rounded-full border border-indigo-200">
                            ⚡ {cnnResult.architecture || 'MobileNetV2 (Inverted Residuals + Linear Bottlenecks)'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-3xl font-black text-purple-700">{cnnResult.confidence}%</span>
                      <p className="text-xs font-bold text-gray-500 uppercase">Model Confidence</p>
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
                        {cnnResult.inferenceTimeMs || 45.0} ms
                      </p>
                    </div>
                  </div>

                  {/* Top Predictions Ranking */}
                  {cnnResult.topPredictions && cnnResult.topPredictions.length > 1 && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <h4 className="text-xs font-bold uppercase text-gray-600 mb-2">MobileNetV2 Top Predictions:</h4>
                      <div className="space-y-2">
                        {cnnResult.topPredictions.map((pred, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 font-medium">{pred.disease} ({pred.crop})</span>
                            <span className="font-bold text-purple-700">{pred.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visual Characteristics */}
                  {cnnResult.symptoms && cnnResult.symptoms.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                        {cnnResult.isHealthy ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )} Visual Characteristics Associated with the Prediction:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {cnnResult.symptoms.map((symptom, idx) => (
                          <span
                            key={idx}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md border ${
                              cnnResult.isHealthy
                                ? 'bg-green-50 text-green-800 border-green-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            • {symptom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations: Preventive Care (Healthy Leaf) vs Treatments (Diseased Leaf) */}
                  {cnnResult.isHealthy ? (
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Preventive Crop Care Recommendations:
                      </h4>
                      <ul className="space-y-2">
                        {(cnnResult.preventiveRecommendations || cnnResult.recommendedTreatments || [
                          'Maintain balanced nutrient and water management based on crop growth stage.',
                          'Conduct routine weekly field scouting to monitor for early signs of pests or foliar stress.',
                          'Ensure optimal plant spacing and weeding for healthy canopy air circulation and sunlight.',
                          'Practice good sanitation of farm equipment and tools to prevent disease transmission.'
                        ]).map((advice, idx) => (
                          <li key={idx} className="p-3 bg-green-50 text-green-900 rounded-lg text-sm font-medium flex items-start gap-2 border border-green-200">
                            <span className="font-extrabold text-green-700">{idx + 1}.</span>
                            <span>{advice}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <>
                      {/* Treatments for Diseased Leaf */}
                      {cnnResult.recommendedTreatments && (
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
                      )}

                      {/* Organic Remedies for Diseased Leaf */}
                      {cnnResult.organicControl && (
                        <div className="p-4 bg-emerald-100/70 border border-emerald-300 rounded-xl mb-4">
                          <h4 className="font-bold text-emerald-900 mb-1">🌱 Bio-Organic Remedy:</h4>
                          <p className="text-sm text-emerald-800 font-medium">{cnnResult.organicControl}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Scientific Disclaimer */}
                  <div className="pt-3 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
                    <span>⚠️ {cnnResult.disclaimer || 'AI-assisted screening based on MobileNetV2. Verify with local agricultural extension officer.'}</span>
                    <span className="font-medium text-gray-400">Krishi Sakha ML Subsystem</span>
                  </div>
                </Card>
              )
            )}
          </div>
        )}

        {/* TAB 2: Environmental IoT Sensor Risk */}
        {activeTab === 'environment' && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-gray-800">Select Field Crop for Sensor Risk Assessment:</label>
                  <p className="text-xs text-gray-500">Evaluates microclimate humidity and temperature risk thresholds for this crop</p>
                </div>
                <select
                  value={envCrop}
                  onChange={(e) => setEnvCrop(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:ring-2 focus:ring-purple-500"
                >
                  {['Rice', 'Wheat', 'Cotton', 'Maize', 'Sugarcane', 'Tomato', 'Potato', 'Soybean', 'Ragi'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </Card>

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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
