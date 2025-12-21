import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, t as translate, getCropName, getAllCrops } from '../utils/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Get saved language from localStorage or default to English
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('farmLanguage');
    console.log('Loaded language from localStorage:', saved);
    return saved || 'en';
  });

  // Save language preference
  useEffect(() => {
    console.log('Saving language to localStorage:', language);
    localStorage.setItem('farmLanguage', language);
    // Update HTML lang attribute for accessibility
    document.documentElement.lang = language === 'kn' ? 'kn' : 'en';
  }, [language]);

  const switchLanguage = (lang) => {
    console.log('Switching language to:', lang);
    if (lang === 'en' || lang === 'kn') {
      setLanguage(lang);
    }
  };

  // Translation helper function
  const t = (key) => translate(key, language);

  const value = {
    language,
    switchLanguage,
    t,
    getCropName: (crop) => getCropName(crop, language),
    getAllCrops: () => getAllCrops(language),
    translations: translations[language],
    isKannada: language === 'kn'
  };

  console.log('Language context value:', value);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;