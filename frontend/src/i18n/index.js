import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import hi from "../locales/hi.json";
import te from "../locales/te.json";

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  te: { translation: te },
};

const savedLanguage = localStorage.getItem("ridesync_language");
const browserLanguage = navigator.language?.split("-")[0] || "en";
const initialLanguage = savedLanguage || (['en', 'hi', 'te'].includes(browserLanguage) ? browserLanguage : 'en');

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  supportedLngs: ["en", "hi", "te"],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
