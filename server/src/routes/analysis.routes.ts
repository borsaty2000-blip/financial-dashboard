import { Router, type Request } from 'express'
import {
	calculateIndicatorSnapshot,
	type Candle,
} from '../services/analysis/indicators.service.js'
import { analyzeElliott } from '../services/analysis/elliott.python.js'
import { analyzeGann } from '../services/analysis/gann.python.js'
import {
	analyze,
	forecastARIMA,
	forecastLSTM,
} from '../services/analysis/statistical.service.js'
import { ConsensusService } from '../services/analysis/consensus.service.js'
import { analyzeCandlesticks } from '../services/analysis/candlestick.python.js'
import {
	anomaly,
	ensemble,
	sentiment,
} from '../services/analysis/ai-features.service.js'
import {
	CandlesService,
	type CandleMarket,
} from '../services/market/candles.service.js'
import { analysisRateLimit } from '../middleware/rateLimit.js'
import { runBacktest } from '../services/analysis/backtesting.python.js'

export const analysisRoutes = Router()
analysisRoutes.use(analysisRateLimit)

function queryPrices(value: unknown) {
	if (typeof value !== 'string') return []
	return value
		.split(',')
		.map(Number)
		.filter((price) => Number.isFinite(price) && price > 0)
}

function querySteps(value: unknown) {
	const steps = typeof value === 'string' ? Number(value) : 30
	return Number.isFinite(steps)
		? Math.max(1, Math.min(365, Math.trunc(steps)))
		: 30
}

function queryNumbers(value: unknown) {
	return typeof value === 'string'
		? value
				.split(',')
				.map(Number)
				.filter((number) => Number.isFinite(number))
		: []
}

function queryMarket(value: unknown): CandleMarket {
	return value === 'TASI' || value === 'GLOBAL' ? value : 'EGX'
}

async function resolveSeries(request: Request) {
	const prices = queryPrices(request.query.prices)
	const dates =
		typeof request.query.dates === 'string'
			? request.query.dates.split(',')
			: []
	if (prices.length)
		return {
			prices,
			dates,
			candles: [],
			source: 'provided',
			count: prices.length,
		}
	const candles = await CandlesService.getCandles(
		request.params.symbol,
		queryMarket(request.query.market),
		'1d',
		250,
	)
	return {
		prices: candles.candles.map((candle) => candle.close),
		dates: candles.candles.map((candle) => candle.date),
		candles: candles.candles,
		source: candles.source,
		count: candles.count,
	}
}

analysisRoutes.get('/:symbol/full', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.prices.length < 3)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات تاريخية كافية لبناء غرفة التحليل',
			})

		const symbol = request.params.symbol.toUpperCase()
		const candles: Candle[] = series.candles.map((candle) => ({
			open: candle.open,
			high: candle.high,
			low: candle.low,
			close: candle.close,
			volume: candle.volume,
		}))
		const dates = series.dates
		const stages = [
			'تحميل الشموع والتحقق من كفاية البيانات',
			'المؤشرات الفنية وقنوات كايتلر وفيبوناتشي',
			'Elliott Wave وGann',
			'الإجماع والإحصاء والتوقعات',
			'الاختبار التاريخي ومقارنة النتائج',
		]
		const settled = await Promise.allSettled([
			Promise.resolve(calculateIndicatorSnapshot(symbol, candles)),
			analyzeElliott(series.prices),
			analyzeGann(series.prices, dates),
			ConsensusService.calculate(symbol, series.prices, dates),
			analyze(series.prices),
			forecastARIMA(series.prices, 7),
			forecastLSTM(series.prices, 7),
			runBacktest('indicators', series.prices, 30, 7),
		])
		const value = <T>(index: number): T | null => {
			const result = settled[index]
			return result?.status === 'fulfilled' ? (result.value as T) : null
		}
		return response.json({
			status: 'success',
			symbol,
			market: queryMarket(request.query.market),
			source: series.source,
			candles_count: series.count,
			stages,
			completed_engines: settled.filter((item) => item.status === 'fulfilled')
				.length,
			data: {
				indicators: value(0),
				elliott: value(1),
				gann: value(2),
				consensus: value(3),
				statistical: value(4),
				arima: value(5),
				lstm: value(6),
				backtest: value(7),
			},
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'Full analysis unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/candlestick', async (request, response) => {
	try {
		const manual = queryNumbers(request.query.opens)
		const manualHighs = queryNumbers(request.query.highs)
		const manualLows = queryNumbers(request.query.lows)
		const manualCloses = queryNumbers(request.query.closes)
		if (
			manual.length &&
			manual.length === manualHighs.length &&
			manual.length === manualLows.length &&
			manual.length === manualCloses.length
		) {
			const dates =
				typeof request.query.dates === 'string'
					? request.query.dates.split(',')
					: []
			return response.json(
				await analyzeCandlesticks(
					manual,
					manualHighs,
					manualLows,
					manualCloses,
					dates,
				),
			)
		}
		const series = await resolveSeries(request)
		if (series.candles.length < 2)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات تاريخية لهذا السهم',
				tried_sources: ['Yahoo', 'Stooq', 'TwelveData', 'Finnhub'],
			})
		const result = await analyzeCandlesticks(
			series.candles.map((candle) => candle.open),
			series.candles.map((candle) => candle.high),
			series.candles.map((candle) => candle.low),
			series.candles.map((candle) => candle.close),
			series.dates,
		)
		return response.json({
			...result,
			source: series.source,
			candles_count: series.count,
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error
					? error.message
					: 'Candlestick service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/consensus', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.prices.length < 30)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات تاريخية كافية لهذا السهم',
				tried_sources: ['Yahoo', 'Stooq', 'TwelveData', 'Finnhub'],
			})
		const result = await ConsensusService.calculate(
			request.params.symbol.toUpperCase(),
			series.prices,
			series.dates,
		)
		return response.json({
			status: 'success',
			data: { ...result, source: series.source, candles_count: series.count },
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error
					? error.message
					: 'Consensus service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/statistical', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.prices.length < 3)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات تاريخية لهذا السهم',
			})
		return response.json({
			...(await analyze(series.prices)),
			source: series.source,
			candles_count: series.count,
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error
					? error.message
					: 'Statistical service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/forecast/arima', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.prices.length < 20)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات تاريخية كافية لهذا السهم',
			})
		return response.json({
			...(await forecastARIMA(series.prices, querySteps(request.query.steps))),
			source: series.source,
			candles_count: series.count,
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'ARIMA service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/forecast/lstm', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.prices.length < 20)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات تاريخية كافية لهذا السهم',
			})
		return response.json({
			...(await forecastLSTM(series.prices, querySteps(request.query.steps))),
			source: series.source,
			candles_count: series.count,
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'LSTM service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/elliott', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.prices.length < 3)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات تاريخية لهذا السهم',
			})
		return response.json({
			...(await analyzeElliott(
				series.prices,
				Number(request.query.order ?? 5),
			)),
			source: series.source,
			candles_count: series.count,
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'Elliott service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/gann', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (
			series.prices.length < 3 ||
			series.dates.length !== series.prices.length
		)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات تاريخية متطابقة لهذا السهم',
			})
		return response.json({
			...(await analyzeGann(series.prices, series.dates)),
			source: series.source,
			candles_count: series.count,
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'Gann service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/indicators', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		const candles: Candle[] = series.prices.map((close) => ({ close }))
		return response.json({
			available: candles.length > 0,
			source: series.source,
			candles_count: series.count,
			timestamp: new Date().toISOString(),
			freshness: 'cached',
			delay_minutes: 15,
			data: calculateIndicatorSnapshot(
				request.params.symbol.toUpperCase(),
				candles,
			),
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error
					? error.message
					: 'Indicator service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/ensemble', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.prices.length < 30)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات كافية للتنبؤ المجمع',
			})
		return response.json({
			...(await ensemble(series.prices, querySteps(request.query.steps))),
			source: series.source,
			candles_count: series.count,
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'Ensemble service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/sentiment', async (request, response) => {
	try {
		return response.json(await sentiment(request.params.symbol.toUpperCase()))
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error
					? error.message
					: 'Sentiment service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/anomalies', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.prices.length < 20)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات كافية لكشف الشذوذ',
			})
		return response.json(
			await anomaly(
				request.params.symbol.toUpperCase(),
				series.prices,
				series.candles.length
					? series.candles.map((candle) => candle.volume)
					: series.prices.map(() => 0),
			),
		)
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'Anomaly service unavailable',
		})
	}
})
