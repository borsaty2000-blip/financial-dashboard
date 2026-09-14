export async function getGlobalComparison() {
	return {
		markets: [
			{ symbol: 'EGX30', name: 'البورصة المصرية', available: true },
			{
				symbol: 'SPX',
				name: 'S&P 500',
				available: false,
				reason: 'لا توجد سلسلة موحدة مهيأة حالياً',
			},
			{
				symbol: 'IXIC',
				name: 'Nasdaq Composite',
				available: false,
				reason: 'لا توجد سلسلة موحدة مهيأة حالياً',
			},
		],
		comparison: [],
		available: false,
		disclaimer:
			'المقارنة العالمية تظهر فقط السلاسل التي تم التحقق من توفرها؛ لا يتم اختلاق قيم مفقودة.',
	}
}
