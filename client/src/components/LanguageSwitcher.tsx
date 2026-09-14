import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '../i18n'
export function LanguageSwitcher() {
	const { i18n, t } = useTranslation()
	const current = i18n.language.split('-')[0]
	return (
		<label className="language-switcher" title={t('common.language')}>
			<span aria-hidden="true">🌐</span>
			<select
				aria-label={t('common.language')}
				value={current}
				onChange={(event) => void i18n.changeLanguage(event.target.value)}
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
