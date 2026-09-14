import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '../i18n'
import { api } from '../lib/api'
export function LanguageSwitcher() {
	const { i18n, t } = useTranslation()
	const current = supportedLanguages.some((item) => item.code === i18n.language)
		? i18n.language
		: 'ar'
	const change = (language: string) => {
		void i18n.changeLanguage(language)
		if (localStorage.getItem('borsaty_access_token'))
			void api('/api/profile', {
				method: 'PUT',
				body: JSON.stringify({ language }),
			}).catch(() => undefined)
	}
	return (
		<label className="language-switcher" title={t('common.language')}>
			<span aria-hidden="true">🌐</span>
			<select
				aria-label={t('common.language')}
				value={current}
				onChange={(event) => change(event.target.value)}
			>
				{supportedLanguages.map((language) => (
					<option key={language.code} value={language.code}>
						{language.nativeName}
					</option>
				))}
			</select>
		</label>
	)
}
