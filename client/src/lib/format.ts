export type NumericValue = number | null | undefined

export const formatEnglishNumber = (
	value: NumericValue,
	maximumFractionDigits = 2,
) => {
	if (value == null || !Number.isFinite(value)) return '—'
	return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

export const formatEnglishInteger = (value: NumericValue) => {
	return formatEnglishNumber(value, 0)
}

export const formatEnglishPercent = (value: NumericValue, digits = 2) => {
	if (value == null || !Number.isFinite(value)) return '—'
	return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`
}

export const formatEnglishScalar = (
	value: string | number | null | undefined,
) => {
	if (typeof value === 'number') return formatEnglishNumber(value)
	return value == null || value === '' ? '—' : value
}

export const formatEnglishDate = (value: string | number | Date) => {
	return new Intl.DateTimeFormat('en-GB', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value))
}
