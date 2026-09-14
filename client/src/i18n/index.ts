import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import arEG from './locales/ar-EG.json'
import arSA from './locales/ar-SA.json'
import arAE from './locales/ar-AE.json'
export const supportedLanguages = [
	{ code: 'ar', nativeName: 'العربية' },
	{ code: 'ar-EG', nativeName: 'العربية - مصر' },
	{ code: 'ar-SA', nativeName: 'العربية - السعودية' },
	{ code: 'ar-AE', nativeName: 'العربية - الإمارات' },
	{ code: 'en', nativeName: 'English' },
	{ code: 'fr', nativeName: 'Français' },
] as const
void i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			ar: { translation: ar },
			'ar-EG': { translation: arEG },
			'ar-SA': { translation: arSA },
			'ar-AE': { translation: arAE },
			en: { translation: en },
			fr: { translation: fr },
		},
		fallbackLng: 'ar',
		supportedLngs: ['ar', 'ar-EG', 'ar-SA', 'ar-AE', 'en', 'fr'],
		detection: {
			order: ['localStorage', 'navigator'],
			caches: ['localStorage'],
			lookupLocalStorage: 'borsaty-language',
		},
		interpolation: { escapeValue: false },
	})
i18n.on('languageChanged', (language) => {
	const normalized = language.split('-')[0]
	document.documentElement.lang = language
	document.documentElement.dir = normalized === 'ar' ? 'rtl' : 'ltr'
	document.body.dataset.language = language
})
export default i18n
