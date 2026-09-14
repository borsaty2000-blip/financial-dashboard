export type ChartType = 'candlestick' | 'ohlc' | 'line' | 'area' | 'heikin-ashi'
export type IndicatorAvailability = 'local' | 'provider' | 'planned'
export type ChartCandle = {
	time: string
	open: number
	high: number
	low: number
	close: number
	volume?: number | null
}
export type ChartEngineConfig = {
	chartType?: ChartType
	theme?: 'light' | 'dark'
	timezone?: 'UTC' | 'local'
	replay?: boolean
}
export type IndicatorDefinition = {
	id: string
	label: string
	category:
		'trend' | 'momentum' | 'volatility' | 'volume' | 'pattern' | 'signal'
	availability: IndicatorAvailability
	provider?: 'fcsapi/chart-js'
}

const local = new Set(['sma', 'ema', 'rsi', 'macd', 'bollinger-bands', 'atr'])
const providerIndicators: Array<
	[string, string, IndicatorDefinition['category']]
> = [
	['adx', 'ADX', 'trend'],
	['aroon', 'Aroon', 'trend'],
	['alligator', 'Alligator', 'trend'],
	['awesome-oscillator', 'Awesome Oscillator', 'momentum'],
	['balance-of-power', 'Balance of Power', 'momentum'],
	['bb-bandwidth', 'BB Bandwidth', 'volatility'],
	['bbtrend', 'BBTrend', 'volatility'],
	['cci', 'CCI', 'momentum'],
	['chaikin-oscillator', 'Chaikin Oscillator', 'volume'],
	['chandelier-exit', 'Chandelier Exit', 'trend'],
	['choppiness-index', 'Choppiness Index', 'volatility'],
	['cmf', 'CMF', 'volume'],
	['cmo', 'CMO', 'momentum'],
	['connors-rsi', 'Connors RSI', 'momentum'],
	['coppock-curve', 'Coppock Curve', 'momentum'],
	['dema', 'DEMA', 'trend'],
	['donchian', 'Donchian Channels', 'volatility'],
	['dpo', 'DPO', 'momentum'],
	['elder-force-index', 'Elder Force Index', 'volume'],
	['elder-ray', 'Elder Ray', 'momentum'],
	['envelope', 'Envelope', 'volatility'],
	['eom', 'Ease of Movement', 'volume'],
	['fisher-transform', 'Fisher Transform', 'momentum'],
	['force-index', 'Force Index', 'volume'],
	['hma', 'HMA', 'trend'],
	['ichimoku', 'Ichimoku Cloud', 'trend'],
	['keltner-channels', 'Keltner Channels', 'volatility'],
	['klinger', 'Klinger Oscillator', 'volume'],
	['kst', 'KST', 'momentum'],
	['mfi', 'MFI', 'volume'],
	['momentum', 'Momentum', 'momentum'],
	['obv', 'OBV', 'volume'],
	['parabolic-sar', 'Parabolic SAR', 'trend'],
	['pivot-points', 'Pivot Points', 'trend'],
	['ppo', 'PPO', 'momentum'],
	['roc', 'ROC', 'momentum'],
	['stochastic', 'Stochastic', 'momentum'],
	['tema', 'TEMA', 'trend'],
	['trix', 'TRIX', 'momentum'],
	['vwap', 'VWAP', 'volume'],
	['williams-r', 'Williams %R', 'momentum'],
	['zigzag', 'ZigZag', 'pattern'],
	['doji', 'Doji', 'pattern'],
	['engulfing', 'Engulfing', 'pattern'],
	['hammer', 'Hammer', 'pattern'],
	['head-shoulders', 'Head and Shoulders', 'pattern'],
	['double-top-bottom', 'Double Top / Bottom', 'pattern'],
	['triangle-breakout', 'Triangle Breakout', 'signal'],
	['ma-cross-signal', 'MA Cross Signal', 'signal'],
	['rsi-signal', 'RSI Signal', 'signal'],
	['volume-spike-signal', 'Volume Spike Signal', 'signal'],
	['support-resistance-signal', 'Support Resistance Signal', 'signal'],
	['fibonacci-retracement', 'Fibonacci Retracement', 'signal'],
	['bollinger-squeeze-signal', 'Bollinger Squeeze Signal', 'signal'],
	['trend-signal', 'Trend Signal', 'signal'],
	['strong-trend-signal', 'Strong Trend Signal', 'signal'],
	['vwap-touch-signal', 'VWAP Touch Signal', 'signal'],
]
export const indicatorRegistry: IndicatorDefinition[] = [
	['sma', 'SMA', 'trend'],
	['ema', 'EMA', 'trend'],
	['rsi', 'RSI', 'momentum'],
	['macd', 'MACD', 'momentum'],
	['bollinger-bands', 'Bollinger Bands', 'volatility'],
	['atr', 'ATR', 'volatility'],
	...providerIndicators.map(([id, label, category]) => ({
		id,
		label,
		category,
		availability: 'provider' as const,
		provider: 'fcsapi/chart-js' as const,
	})),
].map((entry): IndicatorDefinition =>
	Array.isArray(entry)
		? {
				id: entry[0],
				label: entry[1],
				category: entry[2] as IndicatorDefinition['category'],
				availability: local.has(entry[0]) ? 'local' : 'planned',
			}
		: entry,
)

export function getIndicator(id: string) {
	return indicatorRegistry.find((indicator) => indicator.id === id)
}
export function availableIndicators(
	availability: IndicatorAvailability = 'local',
) {
	return indicatorRegistry.filter(
		(indicator) => indicator.availability === availability,
	)
}

export type ReplayFrame = {
	candle: ChartCandle
	index: number
	progress: number
}
export function replayCandles(
	candles: ChartCandle[],
	onFrame: (frame: ReplayFrame) => void,
	intervalMs = 250,
) {
	let index = 0
	const timer = setInterval(
		() => {
			const candle = candles[index]
			if (!candle) {
				clearInterval(timer)
				return
			}
			onFrame({ candle, index, progress: (index + 1) / candles.length })
			index += 1
		},
		Math.max(50, intervalMs),
	)
	return () => clearInterval(timer)
}

export function normalizeChartCandle(value: ChartCandle): ChartCandle | null {
	const numbers = [value.open, value.high, value.low, value.close]
	if (
		!value.time ||
		numbers.some((number) => !Number.isFinite(number)) ||
		value.high < value.low
	)
		return null
	return {
		...value,
		volume:
			value.volume == null || Number.isFinite(value.volume)
				? value.volume
				: null,
	}
}
