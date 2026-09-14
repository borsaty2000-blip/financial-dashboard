export const financialTokens = {
	color: {
		ink: '#17212b',
		muted: '#66727d',
		canvas: '#f7f9fb',
		surface: '#ffffff',
		border: '#e3e8ed',
		primary: '#0071bc',
		primaryStrong: '#005a96',
		positive: '#00a651',
		negative: '#e74c3c',
		neutral: '#66727d',
		warning: '#f39c12',
		egx: '#c8102e',
		tasi: '#006c35',
		gold: '#d7a400',
	},
	space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, section: 48 },
	radius: { sm: 6, md: 10, lg: 14, pill: 999 },
	typography: {
		ui: 'Inter, system-ui, sans-serif',
		arabic: 'Cairo, system-ui, sans-serif',
		number: 'JetBrains Mono, monospace',
	},
	motion: {
		fast: '120ms',
		normal: '180ms',
		slow: '280ms',
		ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
	},
} as const

export type FinancialTokens = typeof financialTokens
export type MarketTone = 'positive' | 'negative' | 'neutral' | 'warning'
export function toneColor(tone: MarketTone) {
	return financialTokens.color[
		tone === 'positive'
			? 'positive'
			: tone === 'negative'
				? 'negative'
				: tone === 'warning'
					? 'warning'
					: 'neutral'
	]
}
