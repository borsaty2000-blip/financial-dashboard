const etfs = [
	{
		symbol: 'EGX30ETF',
		name: 'صندوق مؤشر EGX30',
		market: 'EGX',
		currency: 'EGP',
		holdings: ['COMI', 'ETEL', 'SWDY'],
	},
	{
		symbol: 'EGX70ETF',
		name: 'صندوق مؤشر EGX70',
		market: 'EGX',
		currency: 'EGP',
		holdings: ['ABUK', 'TMGH', 'MFPC'],
	},
	{
		symbol: '9400',
		name: 'صندوق إتقان كابيتال',
		market: 'TASI',
		currency: 'SAR',
		holdings: [],
	},
	{
		symbol: '9405',
		name: 'صندوق الأهلي السعودي',
		market: 'TASI',
		currency: 'SAR',
		holdings: [],
	},
]
export class ETFService {
	static list() {
		return etfs.map((item) => ({ ...item, available: true }))
	}
	static async get(symbol: string) {
		const item = etfs.find((value) => value.symbol === symbol.toUpperCase())
		if (!item) return { symbol, available: false }
		return {
			...item,
			performance: [],
			available: true,
			disclaimer: 'البيانات التفصيلية تعتمد على إفصاح الصندوق.',
		}
	}
}
