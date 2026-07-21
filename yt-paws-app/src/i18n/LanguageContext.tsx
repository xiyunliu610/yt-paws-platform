import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations } from './translations';

const LANGUAGE_STORAGE_KEY = 'app_language';

function detectDeviceLanguage(): Language {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en';
  return locale.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (typeof translations)['en'];
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // First launch: fall back to the device language (US-01.3); afterwards the
  // user's manual choice, once made, always wins on next launch.
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'zh') {
        setLanguageState(stored);
      } else {
        setLanguageState(detectDeviceLanguage());
      }
    })();
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
