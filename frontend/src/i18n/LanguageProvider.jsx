import React, { createContext, useContext, useEffect, useState } from "react";
import i18n from "./index.js";
import { getStoredLanguage, setStoredLanguage } from "../services/settings.js";

const LanguageContext = createContext(null);

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage() || "en");

  useEffect(() => {
    if (!language) return;
    i18n.changeLanguage(language);
    setStoredLanguage(language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageState }}>
      {children}
    </LanguageContext.Provider>
  );
}
