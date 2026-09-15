export type MarketMoodInput = {
	consensus: number | null | undefined
	rsi: number | null | undefined
	macd: string | null | undefined
	volume: number | null | undefined
	priceChange: number | null | undefined
}

export type MarketMoodResult = {
	available: boolean
	score: number
	label: 'ممتاز' | 'خير' | 'محايد' | 'سلبي'
	positive: number
	negative: number
	components: {
		consensus: number
		rsi: number
		macd: number
		priceChange: number
	}
	note: string
}

const finite = (value: number | null | undefined) =>
	typeof value === 'number' && Number.isFinite(value)

export class SentimentService {
	static calculateMarketMood(
		_symbol: string,
		data: MarketMoodInput,
	): MarketMoodResult {
		let positivePoints = 0
		let totalPoints = 0
		const components = { consensus: 0, rsi: 0, macd: 0, priceChange: 0 }

		if (finite(data.consensus)) {
			totalPoints += 40
			components.consensus =
				data.consensus! > 60 ? 40 : data.consensus! > 50 ? 20 : 0
			positivePoints += components.consensus
		}

		if (finite(data.rsi)) {
			totalPoints += 20
			components.rsi =
				data.rsi! > 30 && data.rsi! < 70 ? 20 : data.rsi! < 30 ? 10 : 0
			positivePoints += components.rsi
		}

		if (typeof data.macd === 'string' && data.macd.trim()) {
			totalPoints += 20
			components.macd = data.macd.toLowerCase() === 'bullish' ? 20 : 0
			positivePoints += components.macd
		}

		if (finite(data.priceChange)) {
			totalPoints += 20
			components.priceChange =
				data.priceChange! > 0 ? 20 : data.priceChange! > -2 ? 10 : 0
			positivePoints += components.priceChange
		}

		const score = totalPoints
			? Math.round((positivePoints / totalPoints) * 100)
			: 0
		return {
			available: totalPoints > 0,
			score,
			label:
				score > 70
					? 'ممتاز'
					: score > 50
						? 'خير'
						: score > 30
							? 'محايد'
							: 'سلبي',
			positive: score,
			negative: 100 - score,
			components,
			note: 'مؤشر وصفي موزون من مخرجات التحليل، وليس احتمال نجاح أو توصية تداول.',
		}
	}
}

export const calculateMarketMood =
	SentimentService.calculateMarketMood.bind(SentimentService)

export default SentimentService
