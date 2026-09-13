import { analyzeElliott } from './elliott.python.js'
import { analyzeGann } from './gann.python.js'
import {
	calculateIndicatorSnapshot,
	type Candle,
} from './indicators.service.js'
import { forecastARIMA } from './statistical.service.js'

type Signal = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'

export interface ConsensusResult {
	score: number
	signal: Signal
	confidence: number
	breakdown: Record<string, { score: number; weight: number; signal: Signal }>
	recommendation: string
	timestamp: string
}

const clamp = (value: number) => Math.max(0, Math.min(100, value))
const signalFor = (score: number): Signal =>
	score >= 80
		? 'STRONG_BUY'
		: score >= 60
			? 'BUY'
			: score >= 40
				? 'HOLD'
				: score >= 20
					? 'SELL'
					: 'STRONG_SELL'

function scoreElliott(result: any): number {
	const data = result?.data
	if (!data) return 50
	const direction = data.current_wave?.direction
	const confidence = Number(data.confidence ?? 0.3)
	return clamp(
		50 +
			confidence * 30 +
			(direction === 'up' ? 20 : direction === 'down' ? -20 : 0),
	)
}

function scoreGann(result: any): number {
	const data = result?.data
	if (!data) return 50
	const one = Number(data.angles?.['1x1']?.value)
	const current = Number(data.high ?? 0)
	if (!Number.isFinite(one) || !Number.isFinite(current) || one === 0) return 50
	return clamp(50 + (current >= one ? 15 : -15))
}

function scoreIndicators(result: any): number {
	const data = result?.data
	if (!data) return 50
	const rsi = Number(data.rsi?.value)
	const macdSignal = data.macd?.signal
	let score = 50
	if (Number.isFinite(rsi)) score += rsi < 30 ? 20 : rsi > 70 ? -20 : 0
	if (macdSignal === 'bullish') score += 15
	if (macdSignal === 'bearish') score -= 15
	return clamp(score)
}

function scoreForecast(result: any): number {
	const predictions = result?.data?.forecast
	if (
		!Array.isArray(predictions) ||
		predictions.length < 2 ||
		Number(predictions[0]) <= 0
	)
		return 50
	return clamp(
		50 +
			((Number(predictions.at(-1)) - Number(predictions[0])) /
				Number(predictions[0])) *
				500,
	)
}

export class ConsensusService {
	private static readonly weights = {
		elliott: 0.3,
		gann: 0.2,
		indicators: 0.3,
		forecast: 0.2,
	}

	static async calculate(
		symbol: string,
		prices: number[],
		dates: string[] = [],
	): Promise<ConsensusResult> {
		const candles: Candle[] = prices.map((close) => ({ close }))
		const [elliott, gann, indicators, forecast] = await Promise.all([
			analyzeElliott(prices).catch(() => null),
			dates.length === prices.length
				? analyzeGann(prices, dates).catch(() => null)
				: Promise.resolve(null),
			Promise.resolve({
				status: 'success',
				data: calculateIndicatorSnapshot(symbol, candles),
			}),
			forecastARIMA(prices, 7).catch(() => null),
		])
		const scores = {
			elliott: scoreElliott(elliott),
			gann: scoreGann(gann),
			indicators: scoreIndicators(indicators),
			forecast: scoreForecast(forecast),
		}
		const score = Math.round(
			scores.elliott * this.weights.elliott +
				scores.gann * this.weights.gann +
				scores.indicators * this.weights.indicators +
				scores.forecast * this.weights.forecast,
		)
		const signal = signalFor(score)
		return {
			score,
			signal,
			confidence: Math.round(clamp(40 + Math.abs(score - 50) * 1.5)),
			breakdown: Object.fromEntries(
				Object.entries(scores).map(([key, value]) => [
					key,
					{
						score: Math.round(value),
						weight: this.weights[key as keyof typeof this.weights],
						signal: signalFor(value),
					},
				]),
			),
			recommendation:
				signal === 'STRONG_BUY'
					? 'شراء قوي — توافق مرتفع بين المحركات'
					: signal === 'BUY'
						? 'شراء — أغلبية المحركات إيجابية'
						: signal === 'HOLD'
							? 'انتظار — الإشارات غير حاسمة'
							: signal === 'SELL'
								? 'بيع — أغلبية المحركات سلبية'
								: 'بيع قوي — توافق سلبي مرتفع',
			timestamp: new Date().toISOString(),
		}
	}
}
