export function formatFinancialNumber(
	value: number | null | undefined,
	maximumFractionDigits = 2,
) {
	return value == null || !Number.isFinite(value)
		? '—'
		: value.toLocaleString('en-US', { maximumFractionDigits })
}
export function formatUtc(value: string | number | Date, locale = 'ar-EG') {
	return new Date(value).toLocaleString(locale, {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'UTC',
	})
}
export function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value))
}
export function isFiniteSeries(values: number[]) {
	return values.length > 0 && values.every(Number.isFinite)
}
