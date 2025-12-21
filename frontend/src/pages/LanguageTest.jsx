import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';

const LanguageTest = () => {
  const { language, switchLanguage, t, getCropName, isKannada } = useLanguage();

  useEffect(() => {
    console.log('Language Test Component Mounted');
    console.log('Current language:', language);
    console.log('Is Kannada:', isKannada);
    
    // Test translations
    console.log('Testing translations:');
    console.log('welcome:', t('welcome'));
    console.log('dashboard:', t('dashboard'));
    console.log('welcomeBack:', t('welcomeBack'));
    
    // Test crop names
    console.log('Testing crop names:');
    console.log('Rice (English):', getCropName('Rice', 'en'));
    console.log('Rice (Kannada):', getCropName('Rice', 'kn'));
    console.log('Ragi (English):', getCropName('Ragi', 'en'));
    console.log('Ragi (Kannada):', getCropName('Ragi', 'kn'));
  }, [language, isKannada, t, getCropName]);

  const handleSwitchToKannada = () => {
    console.log('Switching to Kannada');
    switchLanguage('kn');
  };

  const handleSwitchToEnglish = () => {
    console.log('Switching to English');
    switchLanguage('en');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="farmer" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Language Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Language Status</h2>
          <div className="space-y-2">
            <p><strong>Current Language:</strong> {language}</p>
            <p><strong>Is Kannada:</strong> {isKannada ? 'Yes' : 'No'}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Translations</h2>
          <div className="space-y-2">
            <p><strong>welcome:</strong> {t('welcome')}</p>
            <p><strong>dashboard:</strong> {t('dashboard')}</p>
            <p><strong>welcomeBack:</strong> {t('welcomeBack')}</p>
            <p><strong>farmStatus:</strong> {t('farmStatus')}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Crop Names</h2>
          <div className="space-y-2">
            <p><strong>Rice (English):</strong> {getCropName('Rice', 'en')}</p>
            <p><strong>Rice (Kannada):</strong> {getCropName('Rice', 'kn')}</p>
            <p><strong>Ragi (English):</strong> {getCropName('Ragi', 'en')}</p>
            <p><strong>Ragi (Kannada):</strong> {getCropName('Ragi', 'kn')}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Manual Switch Test</h2>
          <div className="flex gap-4">
            <button
              onClick={handleSwitchToEnglish}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Switch to English
            </button>
            <button
              onClick={handleSwitchToKannada}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Switch to Kannada
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageTest;