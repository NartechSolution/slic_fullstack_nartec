import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import newRequest from './utils/userRequest'

const storedLanguage = localStorage.getItem('selectedLanguage')
const initialLanguage = storedLanguage || 'ar'

const dynamicTranslations = {
  ar: {},
  en: {}
}

// 1. Initialize i18n IMMEDIATELY and synchronously with defaults
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: ['ar', 'en'],
    detection: {
      order: ['navigator']
    },
    interpolation: {
      escapeValue: false
    },
    lng: initialLanguage,
    resources: {
      ar: { translation: {} },
      en: { translation: {} }
    }
  });

// 2. Function to fetch translations and update i18n dynamically
const fetchTranslations = async () => {
  try {
    const response = await newRequest.get('/language/translations')
    
    // Axios response validation (no .ok property)
    if (!response || response.status < 200 || response.status >= 300) {
      throw new Error(`API returned status ${response?.status}`);
    }
    
    const data = response.data; // Axios already parsed the JSON
    
    // Validate response structure
    if (!data || typeof data !== 'object' || !data.data) {
      throw new Error('Invalid translation data received from API');
    }
    
    const dataArray = Object.entries(data.data)

    dataArray.forEach(([key, value]) => {
      dynamicTranslations.ar[key] = value
      dynamicTranslations.en[key] = key
    })

    // Add resource bundles to the ALREADY initialized i18n instance
    i18n.addResourceBundle('ar', 'translation', dynamicTranslations.ar, true, true)
    i18n.addResourceBundle('en', 'translation', dynamicTranslations.en, true, true)
    
    // console.log('Translations updated successfully');
  } catch (error) {
    // console.error('Failed to update translations:', error.message);
  }
}

// Call the fetchTranslations function (continues in background)
fetchTranslations()

export default i18n
