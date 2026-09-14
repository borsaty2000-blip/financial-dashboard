import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
export const supportedLanguages = [
	{ code: 'ar', nativeName: 'العربية' },
	{ code: 'en', nativeName: 'English' },
	{ code: 'fr', nativeName: 'Français' },
] as const
void i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			ar: { translation: ar },
			en: { translation: en },
			fr: { translation: fr },
		},
		fallbackLng: 'ar',
		supportedLngs: ['ar', 'en', 'fr'],
		detection: {
			order: ['localStorage', 'navigator'],
			caches: ['localStorage'],
			lookupLocalStorage: 'borsaty-language',
		},
		interpolation: { escapeValue: false },
	})
i18n.on('languageChanged', (language) => {
	const normalized = language.split('-')[0]
	document.documentElement.lang = normalized
	document.documentElement.dir = normalized === 'ar' ? 'rtl' : 'ltr'
	document.body.dataset.language = normalized
})
export default i18n
