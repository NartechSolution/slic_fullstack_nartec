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

// Function to fetch translations
const fetchTranslations = async () => {
  try {
    try {
      const response = await newRequest.get('/language/translations')

      // Check if response is ok (status 200-299)
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json()

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response structure received from API');
      }

      // Check if data.data exists, is not null, and has properties
      if (!data.data || typeof data.data !== 'object' || Object.keys(data.data).length === 0) {
        throw new Error('API returned empty or null data');
      }

      const dataArray = Object.entries(data.data)

      dataArray.forEach(([key, value]) => {
        dynamicTranslations.ar[key] = value
        dynamicTranslations.en[key] = key
      })

      // console.log(data.data, 'Language data loaded successfully');

      // Initialize i18n with fetched translations
      i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
          dynamicTranslations: {},
          fallbackLng: ['ar', 'en'],
          detection: {
            order: ['navigator']
          },
          interpolation: {
            escapeValue: false
          },
          lng: initialLanguage,
        })

      // Add resource bundles after initializing i18n
      i18n.addResourceBundle('ar', 'translation', dynamicTranslations.ar)
      i18n.addResourceBundle('en', 'translation', dynamicTranslations.en)

    } catch (apiError) {
      // console.warn('Failed to fetch translations from API:', apiError.message);
      throw apiError;
    }
  } catch (error) {
    // console.error('Error initializing translations:', error);
    initializeWithDefaults();
  }
}

// Helper function to initialize i18n with default values
const initializeWithDefaults = () => {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      dynamicTranslations: {},
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
    })
    .catch((err) => {
      // console.error('Failed to initialize i18n with defaults:', err);
    })
}

// Call the fetchTranslations function
fetchTranslations()

export default i18n
