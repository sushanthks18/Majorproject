import React, { useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSwitcher = () => {
  const { language, switchLanguage, isKannada } = useLanguage();

  const handleToggle = () => {
    const newLang = language === 'en' ? 'kn' : 'en';
    console.log('Switching language to:', newLang);
    switchLanguage(newLang);
  };

  // Log language changes for debugging
  useEffect(() => {
    console.log('Language changed to:', language);
  }, [language]);

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
      title={isKannada ? "Switch to English" : "ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ"}
    >
      <Globe className="w-4 h-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">
        {isKannada ? 'ಕನ್ನಡ' : 'English'}
      </span>
      <div className="flex gap-1">
        <span className={`text-xs px-1.5 py-0.5 rounded ${language === 'en' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          EN
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${language === 'kn' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          ಕನ್ನಡ
        </span>
      </div>
    </button>
  );
};

export default LanguageSwitcher;