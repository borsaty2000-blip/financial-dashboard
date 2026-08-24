const periodFormatter = new Intl.DateTimeFormat('en-GB', {
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC',
})

export const formatPeriod = (period: string): string => {
	return periodFormatter.format(new Date(`${period}T00:00:00Z`))
}
