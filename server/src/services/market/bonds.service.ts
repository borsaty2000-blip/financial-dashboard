const bonds = [
	{
		symbol: 'EG-TBILL-1Y',
		name: 'أذون خزانة مصرية سنة',
		market: 'EG',
		currency: 'EGP',
		maturity: '1Y',
	},
	{
		symbol: 'EG-BOND-3Y',
		name: 'سند حكومي مصري 3 سنوات',
		market: 'EG',
		currency: 'EGP',
		maturity: '3Y',
	},
	{
		symbol: 'SA-SUKUK-5Y',
		name: 'صك حكومي سعودي 5 سنوات',
		market: 'SA',
		currency: 'SAR',
		maturity: '5Y',
	},
	{
		symbol: 'SA-BOND-10Y',
		name: 'سند حكومي سعودي 10 سنوات',
		market: 'SA',
		currency: 'SAR',
		maturity: '10Y',
	},
]
export class BondsService {
	static list() {
		return bonds.map((bond) => ({ ...bond, available: true }))
	}
	static async get(symbol: string) {
		const bond = bonds.find((item) => item.symbol === symbol.toUpperCase())
		return bond
			? {
					...bond,
					yield: null,
					price: null,
					available: false,
					message: 'العائد والسعر يتطلبان مصدر سندات مرخصاً.',
				}
			: { symbol, available: false }
	}
}
