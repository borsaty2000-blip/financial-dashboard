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
import { SentimentService } from '../services/analysis/sentiment.service.js'

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
			symbol: request.params.symbol.toUpperCase(),
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
		symbol: candles.symbol,
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
		if (series.prices.length < 60)
			return response.status(404).json({
				status: 'unavailable',
				message:
					'لا توجد بيانات تاريخية كافية لبناء تحليل موثوق؛ يلزم توفر 60 جلسة على الأقل',
				candles_count: series.count,
			})

		const symbol = series.symbol
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
			'Elliott Wave وGann التاريخي والسعري',
			'تحليل نماذج الشموع والسلوك السعري',
			'الإجماع والإحصاء والتوقعات',
			'الاختبار التاريخي ومقارنة النتائج',
		]
		const settled = await Promise.allSettled([
			Promise.resolve(calculateIndicatorSnapshot(symbol, candles)),
			analyzeElliott(series.prices),
			analyzeGann(series.prices, dates),
			analyzeCandlesticks(
				series.candles.map((candle) => candle.open),
				series.candles.map((candle) => candle.high),
				series.candles.map((candle) => candle.low),
				series.candles.map((candle) => candle.close),
				dates,
			),
			ConsensusService.calculate(symbol, series.prices, dates),
			analyze(series.prices),
			forecastARIMA(series.prices, 7),
			forecastLSTM(series.prices, 7),
			runBacktest('indicators', series.prices, 30, 7),
		])
		const engineNames = [
			'indicators',
			'elliott',
			'gann',
			'candlestick',
			'consensus',
			'statistical',
			'arima',
			'lstm',
			'backtest',
		] as const
		const value = <T>(index: number): T | null => {
			const result = settled[index]
			return result?.status === 'fulfilled' ? (result.value as T) : null
		}
		const engineStatuses = settled.map((result, index) => {
			if (result.status === 'rejected')
				return { name: engineNames[index], status: 'unavailable' as const }
			const value = result.value as Record<string, unknown> | null
			if (value?.status === 'fallback')
				return {
					name: engineNames[index],
					status: 'educational_fallback' as const,
				}
			if (value?.available === false)
				return { name: engineNames[index], status: 'unavailable' as const }
			return { name: engineNames[index], status: 'computed' as const }
		})
		const gannResult = value<Record<string, unknown>>(2)
		const gannData =
			gannResult?.data && typeof gannResult.data === 'object'
				? (gannResult.data as Record<string, unknown>)
				: gannResult
		if (gannData) {
			gannData.price_time_context = {
				first_date: dates[0] ?? null,
				last_date: dates.at(-1) ?? null,
				first_price: series.prices[0] ?? null,
				last_price: series.prices.at(-1) ?? null,
				high_date:
					dates[series.prices.indexOf(Math.max(...series.prices))] ?? null,
				low_date:
					dates[series.prices.indexOf(Math.min(...series.prices))] ?? null,
			}
		}
		const consensusResult = value<Record<string, unknown>>(4)
		const indicatorResult = value<Record<string, unknown>>(0)
		const indicatorData =
			indicatorResult?.data && typeof indicatorResult.data === 'object'
				? (indicatorResult.data as Record<string, unknown>)
				: indicatorResult
		const rsiValue =
			indicatorData?.rsi && typeof indicatorData.rsi === 'object'
				? Number((indicatorData.rsi as Record<string, unknown>).value)
				: null
		const macdSignal =
			indicatorData?.macd && typeof indicatorData.macd === 'object'
				? String((indicatorData.macd as Record<string, unknown>).signal ?? '')
				: null
		const latest = series.prices.at(-1)
		const previous = series.prices.at(-2)
		const priceChange =
			Number.isFinite(latest) && Number.isFinite(previous) && previous
				? ((latest! - previous!) / previous!) * 100
				: null
		const marketMood = SentimentService.calculateMarketMood(symbol, {
			consensus: Number(consensusResult?.score),
			rsi: Number.isFinite(rsiValue) ? rsiValue : null,
			macd: macdSignal,
			volume: series.candles.at(-1)?.volume ?? null,
			priceChange,
		})
		return response.json({
			status: 'success',
			symbol,
			market: queryMarket(request.query.market),
			source: series.source,
			candles_count: series.count,
			data_quality: {
				status: 'historical_or_delayed',
				price_freshness: 'not_guaranteed_realtime',
				decision: 'NO_TRADE_DECISION',
				message:
					'البيانات والتحليلات تعليمية؛ لا تُستخدم وحدها لاتخاذ قرار شراء أو بيع.',
			},
			stages,
			completed_engines: engineStatuses.filter(
				(item) => item.status !== 'unavailable',
			).length,
			engine_statuses: engineStatuses,
			data: {
				marketMood,
				indicators: value(0),
				elliott: value(1),
				gann: gannResult,
				candlestick: value(3),
				consensus: consensusResult,
				statistical: value(5),
				arima: value(6),
				lstm: value(7),
				backtest: value(8),
			},
		})
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message: 'تعذر إكمال غرفة التحليل حالياً؛ أعد المحاولة لاحقاً',
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
			series.symbol,
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
			data: calculateIndicatorSnapshot(series.symbol, candles),
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
				series.symbol,
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
