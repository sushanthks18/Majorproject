import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';

const TestTranslations = () => {
  const { t, getCropName, isKannada, language } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Translation Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Language Info</h2>
            <div className="space-y-2">
              <p><strong>Current Language:</strong> {language}</p>
              <p><strong>Is Kannada:</strong> {isKannada ? 'Yes' : 'No'}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Translations</h2>
            <div className="space-y-2">
              <p><strong>Welcome:</strong> {t('welcome')}</p>
              <p><strong>Dashboard:</strong> {t('dashboard')}</p>
              <p><strong>Save:</strong> {t('save')}</p>
              <p><strong>Cancel:</strong> {t('cancel')}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Dashboard Translations</h2>
            <div className="space-y-2">
              <p><strong>Welcome Back:</strong> {t('welcomeBack')}</p>
              <p><strong>Farm Status:</strong> {t('farmStatus')}</p>
              <p><strong>Live Sensor Data:</strong> {t('liveSensorData')}</p>
              <p><strong>Critical Alerts:</strong> {t('criticalAlerts')}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Crop Names</h2>
            <div className="space-y-2">
              <p><strong>Rice:</strong> {getCropName('Rice')}</p>
              <p><strong>Maize:</strong> {getCropName('Maize')}</p>
              <p><strong>Ragi:</strong> {getCropName('Ragi')}</p>
              <p><strong>Banana:</strong> {getCropName('Banana')}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <div className="text-sm text-gray-600">
            <p>Check browser console for detailed translation logs.</p>
            <p>Try switching languages using the language toggle in the navbar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestTranslations;