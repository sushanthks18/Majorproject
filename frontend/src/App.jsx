import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Toaster } from 'react-hot-toast';

// Import pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import FarmerDashboard from './pages/farmer/Dashboard';
import CropRecommendation from './pages/farmer/CropRecommendation';
import DiseaseCheck from './pages/farmer/DiseaseCheck';
import FindLabour from './pages/farmer/FindLabour';
import MyRequests from './pages/farmer/MyRequests';
import MandiPrices from './pages/farmer/MandiPrices';
import Analytics from './pages/farmer/Analytics';
import Notifications from './pages/farmer/Notifications';
import FarmerProfile from './pages/farmer/Profile';
import AgentDashboard from './pages/agent/Dashboard';
import AgentProfile from './pages/agent/AgentProfile';
import ServiceRequests from './pages/agent/ServiceRequests';
import FieldRegistration from './pages/farmer/FieldRegistration';
import FieldsList from './pages/farmer/FieldsList';
import SatelliteMonitoring from './pages/farmer/SatelliteMonitoring';
import SmartIrrigation from './pages/farmer/SmartIrrigation';
import FertilizerOptimization from './pages/farmer/FertilizerOptimization';
import TestTranslations from './pages/TestTranslations';
import LanguageTest from './pages/LanguageTest';
import News from './pages/farmer/News';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return <div className="animate-fadeIn">{children}</div>;
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

function AppContent() {
  const { loading } = useAuth();
  
  // Show loading screen during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-2xl font-semibold text-gray-700">KrishiSakha</p>
          <p className="text-gray-500 mt-2">Your Farm Companion</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/test-translations" element={<TestTranslations />} />
          <Route path="/language-test" element={<LanguageTest />} /> {/* Add this route */}

          {/* Farmer Routes */}
          <Route
            path="/farmer/dashboard"
            element={
              <ProtectedRoute allowedRole="farmer">
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/crop-recommendation"
            element={
              <ProtectedRoute allowedRole="farmer">
                <CropRecommendation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/disease-check"
            element={
              <ProtectedRoute allowedRole="farmer">
                <DiseaseCheck />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/find-labour"
            element={
              <ProtectedRoute allowedRole="farmer">
                <FindLabour />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/my-requests"
            element={
              <ProtectedRoute allowedRole="farmer">
                <MyRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/mandi-prices"
            element={
              <ProtectedRoute allowedRole="farmer">
                <MandiPrices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/analytics"
            element={
              <ProtectedRoute allowedRole="farmer">
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/notifications"
            element={
              <ProtectedRoute allowedRole="farmer">
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/profile"
            element={
              <ProtectedRoute allowedRole="farmer">
                <FarmerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/alerts"
            element={
              <ProtectedRoute allowedRole="farmer">
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/fields"
            element={
              <ProtectedRoute allowedRole="farmer">
                <FieldsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/register-field"
            element={
              <ProtectedRoute allowedRole="farmer">
                <FieldRegistration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/satellite-monitoring/:fieldId"
            element={
              <ProtectedRoute allowedRole="farmer">
                <SatelliteMonitoring />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/irrigation/:fieldId"
            element={
              <ProtectedRoute allowedRole="farmer">
                <SmartIrrigation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/fertilizer/:fieldId"
            element={
              <ProtectedRoute allowedRole="farmer">
                <FertilizerOptimization />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/news"
            element={
              <ProtectedRoute allowedRole="farmer">
                <News />
              </ProtectedRoute>
            }
          />

          {/* Agent Routes */}
          <Route
            path="/agent/dashboard"
            element={
              <ProtectedRoute allowedRole="agent">
                <AgentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/profile"
            element={
              <ProtectedRoute allowedRole="agent">
                <AgentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/requests"
            element={
              <ProtectedRoute allowedRole="agent">
                <ServiceRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/active-jobs"
            element={
              <ProtectedRoute allowedRole="agent">
                <ServiceRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/earnings"
            element={
              <ProtectedRoute allowedRole="agent">
                <AgentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    </>
  );
}

export default App;
