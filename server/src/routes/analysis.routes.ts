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
import { buildSmartSummary } from '../services/analysis/smartSummary.service.js'
import { analyzeElliottMTF } from '../services/analysis/elliott-mtf.python.js'
import { buildAdvancedAnalysis } from '../services/analysis/advanced-analysis.service.js'
import { makeDataQuality } from '../services/market/data-quality.js'
import {
	analyzeHarmonic,
	buildDecisionSupport,
	calculateConfluence,
} from '../services/analysis/confluence.service.js'

export const analysisRoutes = Router()
analysisRoutes.use(analysisRateLimit)

analysisRoutes.get('/:symbol/elliott-mtf', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.candles.length < 60)
			return response.status(404).json({
				status: 'unavailable',
				message: 'يلزم توفر 60 شمعة على الأقل لبناء تحليل متعدد الأطر',
			})
		const intraday = await CandlesService.getCandles(
			series.symbol,
			queryMarket(request.query.market),
			'4h',
			250,
		).catch(() => null)
		const dailyCandles = series.candles.map((candle) => ({
			open: candle.open,
			high: candle.high,
			low: candle.low,
			close: candle.close,
			volume: candle.volume,
		}))
		const candlesByTf: Record<string, typeof dailyCandles> = {
			daily: dailyCandles,
		}
		if (intraday && intraday.candles.length >= 30)
			candlesByTf['4h'] = intraday.candles.map((candle) => ({
				open: candle.open,
				high: candle.high,
				low: candle.low,
				close: candle.close,
				volume: candle.volume,
			}))
		const result = await analyzeElliottMTF(dailyCandles, candlesByTf)
		return response.json({
			...result,
			symbol: series.symbol,
			market: queryMarket(request.query.market),
			source: series.source,
			candles_count: series.count,
			decision: 'NO_TRADE_DECISION',
		})
	} catch {
		return response.status(502).json({
			status: 'error',
			message: 'تعذر إكمال Elliott متعدد الأطر حالياً',
		})
	}
})

/** Evidence-first advanced report; unavailable data stays explicitly unavailable. */
analysisRoutes.get('/:symbol/advanced', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.candles.length < 30)
			return response.status(404).json({
				status: 'unavailable',
				message: 'يلزم توفر 30 شمعة OHLCV على الأقل لبناء التقرير المتقدم',
				candles_count: series.count,
			})
		const result = buildAdvancedAnalysis({
			symbol: series.symbol,
			market: queryMarket(request.query.market),
			candles: series.candles,
			source: series.source,
			fetchedAt: new Date().toISOString(),
		})
			return response.json({
				status: 'success',
				data: result,
				data_quality: series.data_quality,
				decision: 'NO_TRADE_DECISION',
			})
	} catch {
		return response.status(502).json({
			status: 'error',
			message: 'تعذر إكمال التقرير المتقدم حالياً؛ أعد المحاولة لاحقاً',
		})
	}
})

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
				data_quality: makeDataQuality({
					status: 'historical',
					provider: 'request',
					warnings: ['تم تمرير الأسعار مباشرة إلى محرك التحليل'],
				}),
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
			data_quality: candles.data_quality,
		}
}

async function resolveAnalysisSeries(request: Request) {
	const body = request.body as { prices?: unknown; candles?: unknown } | undefined
	if (Array.isArray(body?.candles) && body.candles.length) {
		const candles = body.candles as Array<Candle & { date?: string }>
		return {
			symbol: request.params.symbol.toUpperCase(),
			prices: candles.map((candle) => Number(candle.close)).filter(Number.isFinite),
			dates: candles.map((candle) => candle.date ?? new Date().toISOString()),
			candles,
			source: 'request',
			count: candles.length,
			data_quality: makeDataQuality({ status: 'historical', provider: 'request', warnings: ['تم تمرير الشموع مباشرة إلى التحليل'] }),
		}
	}
	if (Array.isArray(body?.prices) && body.prices.length) {
		const prices = body.prices.map(Number).filter((price) => Number.isFinite(price) && price > 0)
		const candles = prices.map((close) => ({ close, open: close, high: close, low: close, volume: 0, date: new Date().toISOString() })) as Array<Candle & { date: string }>
		return {
			symbol: request.params.symbol.toUpperCase(), prices, dates: candles.map((candle) => candle.date), candles,
			source: 'request', count: prices.length,
			data_quality: makeDataQuality({ status: 'historical', provider: 'request', warnings: ['تم تمرير الأسعار مباشرة؛ لا تتوفر بيانات OHLCV كاملة'] }),
		}
	}
	return resolveSeries(request)
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
		const advancedAnalysis = buildAdvancedAnalysis({
			symbol,
			market: queryMarket(request.query.market),
			candles: series.candles,
			source: series.source,
			fetchedAt: new Date().toISOString(),
		})
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
			if (
				value?.engine_mode === 'python_live' ||
				value?.source === 'python_vercel'
			)
				return { name: engineNames[index], status: 'python_live' as const }
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
					...series.data_quality,
					warnings: [
						...series.data_quality.warnings,
						'البيانات والتحليلات تعليمية؛ لا تُستخدم وحدها لاتخاذ قرار شراء أو بيع.',
					],
				},
			stages,
			python_engine: {
				live: engineStatuses.some((item) => item.status === 'python_live'),
					status: engineStatuses.some((item) => item.status === 'python_live')
						? 'متاح'
						: 'غير متاح لهذا الرمز',
				engines: engineStatuses
					.filter((item) => item.status === 'python_live')
					.map((item) => item.name),
			},
			completed_engines: engineStatuses.filter(
				(item) => item.status !== 'unavailable',
			).length,
			engine_statuses: engineStatuses,
			data: {
				advanced: advancedAnalysis,
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

analysisRoutes.get('/:symbol/brilliant-summary', async (request, response) => {
	try {
		const series = await resolveSeries(request)
		if (series.prices.length < 60)
			return response.status(404).json({
				status: 'unavailable',
				message: 'لا توجد بيانات تاريخية كافية لبناء ملخص موثوق',
			})
		const candles: Candle[] = series.candles.map((candle) => ({
			open: candle.open,
			high: candle.high,
			low: candle.low,
			close: candle.close,
			volume: candle.volume,
		}))
		const results = await Promise.allSettled([
			Promise.resolve(calculateIndicatorSnapshot(series.symbol, candles)),
			analyzeElliott(series.prices),
			analyzeGann(series.prices, series.dates),
			analyze(series.prices),
		])
		const resultAt = (index: number) => {
			const result = results[index]
			return result?.status === 'fulfilled' &&
				result.value &&
				typeof result.value === 'object'
				? (result.value as Record<string, unknown>)
				: null
		}
		const unwrap = (value: Record<string, unknown> | null) =>
			value?.data && typeof value.data === 'object'
				? (value.data as Record<string, unknown>)
				: value
		const indicators = unwrap(resultAt(0))
		const elliott = unwrap(resultAt(1))
		const gann = unwrap(resultAt(2))
		const statistical = unwrap(resultAt(3))
		const rsi =
			indicators?.rsi && typeof indicators.rsi === 'object'
				? Number((indicators.rsi as Record<string, unknown>).value)
				: null
		const macd =
			indicators?.macd && typeof indicators.macd === 'object'
				? String((indicators.macd as Record<string, unknown>).signal ?? '')
				: null
		const currentWave =
			elliott?.current_wave && typeof elliott.current_wave === 'object'
				? (elliott.current_wave as Record<string, unknown>)
				: null
		const gannSquare =
			gann?.square_of_nine && typeof gann.square_of_nine === 'object'
				? (gann.square_of_nine as Record<string, unknown>)
				: null
		const first = series.prices[0] ?? null
		const last = series.prices.at(-1) ?? null
		const lastCandle = series.candles.at(-1)
		const summary = buildSmartSummary({
			symbol: series.symbol,
			price: Number.isFinite(last) ? last : null,
			updatedAt: new Date().toISOString(),
			rsi: Number.isFinite(rsi) ? rsi : null,
			macd,
			wave: currentWave?.wave ? String(currentWave.wave) : null,
			waveDirection: currentWave?.direction
				? String(currentWave.direction)
				: null,
			gannDirection:
				first != null &&
				last != null &&
				Number.isFinite(first) &&
				Number.isFinite(last)
					? last >= first
						? 'up'
						: 'down'
					: null,
			gannSupport: Number(gannSquare?.support) || null,
			gannResistance: Number(gannSquare?.resistance) || null,
			volatility: Number(statistical?.volatility) || null,
			candleSignal:
				lastCandle && lastCandle.close !== lastCandle.open
					? lastCandle.close > lastCandle.open
						? 'bullish'
						: 'bearish'
					: null,
		})
		return response.json({
			status: 'success',
			data: summary,
			data_quality: {
				source: series.source,
				candles_count: series.count,
				data_quality: series.data_quality,
				decision: 'NO_TRADE_DECISION',
			},
		})
	} catch {
		return response
			.status(502)
			.json({ status: 'error', message: 'تعذر بناء الملخص التحليلي حالياً' })
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

analysisRoutes.post('/:symbol/elliott-mtf', async (request, response) => {
	try {
		const series = await resolveAnalysisSeries(request)
		if (series.candles.length < 60)
			return response.status(422).json({ status: 'insufficient_data', message: 'يلزم 60 شمعة على الأقل للتحليل متعدد الأطر', data_quality: series.data_quality })
		const complete = series.candles.map((candle) => ({
			open: Number(candle.open ?? candle.close), high: Number(candle.high ?? candle.close),
			low: Number(candle.low ?? candle.close), close: Number(candle.close), volume: Number(candle.volume ?? 0),
		}))
		const result = await analyzeElliottMTF(complete, { daily: complete })
		return response.json({ status: 'success', data: result, source: series.source, candles_count: series.count, data_quality: series.data_quality })
	} catch {
		return response.status(502).json({ status: 'error', message: 'تعذر تنفيذ Elliott متعدد الأطر' })
	}
})

analysisRoutes.post('/:symbol/gann', async (request, response) => {
	try {
		const series = await resolveAnalysisSeries(request)
		if (series.prices.length < 50)
			return response.status(422).json({ status: 'insufficient_data', message: 'يلزم 50 شمعة لتحليل Gann الكامل', data_quality: series.data_quality })
		const result = await analyzeGann(series.prices, series.dates)
		return response.json({ status: 'success', data: result, source: series.source, candles_count: series.count, data_quality: series.data_quality })
	} catch {
		return response.status(502).json({ status: 'error', message: 'تعذر تنفيذ Gann' })
	}
})

analysisRoutes.post('/:symbol/harmonic', async (request, response) => {
	try {
		const series = await resolveAnalysisSeries(request)
		const complete = series.candles.map((candle) => ({ open: Number(candle.open ?? candle.close), high: Number(candle.high ?? candle.close), low: Number(candle.low ?? candle.close), close: Number(candle.close), volume: Number(candle.volume ?? 0) }))
		const data = analyzeHarmonic(complete)
		return response.json({ status: data.status, data, source: series.source, candles_count: series.count, data_quality: series.data_quality })
	} catch {
		return response.status(502).json({ status: 'error', message: 'تعذر تنفيذ Harmonic' })
	}
})

analysisRoutes.post('/:symbol/confluence', async (request, response) => {
	try {
		const series = await resolveAnalysisSeries(request)
		if (series.candles.length < 30)
			return response.status(422).json({ status: 'insufficient_data', message: 'يلزم 30 شمعة لحساب Confluence', data_quality: series.data_quality })
		const [elliott, gann] = await Promise.all([analyzeElliott(series.prices), analyzeGann(series.prices, series.dates)])
		const complete = series.candles.map((candle) => ({ open: Number(candle.open ?? candle.close), high: Number(candle.high ?? candle.close), low: Number(candle.low ?? candle.close), close: Number(candle.close), volume: Number(candle.volume ?? 0) }))
		const harmonic = analyzeHarmonic(complete) as Record<string, unknown>
		const indicators = calculateIndicatorSnapshot(series.symbol, series.candles)
		const data = calculateConfluence({ candles: complete, elliott: elliott as Record<string, unknown>, gann: gann as Record<string, unknown>, indicators: indicators as Record<string, unknown>, harmonic })
		return response.json({ status: 'success', data, source: series.source, candles_count: series.count, data_quality: series.data_quality })
	} catch {
		return response.status(502).json({ status: 'error', message: 'تعذر حساب Confluence' })
	}
})

analysisRoutes.post('/:symbol/recommendation', async (request, response) => {
	try {
		const series = await resolveAnalysisSeries(request)
		const complete = series.candles.map((candle) => ({ open: Number(candle.open ?? candle.close), high: Number(candle.high ?? candle.close), low: Number(candle.low ?? candle.close), close: Number(candle.close), volume: Number(candle.volume ?? 0) }))
		const harmonic = analyzeHarmonic(complete) as Record<string, unknown>
		const [elliott, gann] = await Promise.all([analyzeElliott(series.prices), analyzeGann(series.prices, series.dates)])
		const confluence = calculateConfluence({ candles: complete, elliott: elliott as Record<string, unknown>, gann: gann as Record<string, unknown>, indicators: calculateIndicatorSnapshot(series.symbol, series.candles) as Record<string, unknown>, harmonic })
		const data = buildDecisionSupport(Number(confluence.bullish_confluence), complete)
		return response.json({ status: 'success', data: { ...data, confluence }, source: series.source, candles_count: series.count, data_quality: series.data_quality })
	} catch {
		return response.status(502).json({ status: 'error', message: 'تعذر بناء Decision Support' })
	}
})

analysisRoutes.get('/:symbol/matrix', async (request, response) => {
	try {
		const market = queryMarket(request.query.market)
		const timeframes = [
			['1m', '1m'], ['5m', '5m'], ['15m', '15m'], ['30m', '30m'],
			['1h', '1h'], ['4h', '4h'], ['1d', '1d'], ['1w', '1w'], ['1M', '1M'],
		] as const
		const fetched = await Promise.all(timeframes.map(async ([label, interval]) => {
			const candles = await CandlesService.getCandles(request.params.symbol, market, interval, interval === '1d' ? 250 : 120).catch(() => null)
			if (!candles || candles.candles.length < 20)
				return [label, { status: 'unavailable', candles_count: candles?.count ?? 0, data_quality: candles?.data_quality ?? null }] as const
			const snapshot = calculateIndicatorSnapshot(request.params.symbol.toUpperCase(), candles.candles)
			const rsi = snapshot.rsi.value
			const trend = snapshot.macd.signal === 'bullish' ? 'up' : snapshot.macd.signal === 'bearish' ? 'down' : 'neutral'
			const signal = snapshot.recommendation === 'BUY' ? 'BUY' : snapshot.recommendation === 'SELL' ? 'SELL' : 'NEUTRAL'
			return [label, { status: 'available', trend, signal, rsi, confidence: rsi == null ? null : Number((Math.min(1, Math.max(0, 1 - Math.abs(50 - rsi) / 50))).toFixed(2)), candles_count: candles.count, source: candles.source, data_quality: candles.data_quality }] as const
		}))
		const matrix = Object.fromEntries(fetched) as Record<string, { status: string; signal?: string }>
		const available = Object.values(matrix).filter((item) => item.status === 'available')
		const buy = available.filter((item) => item.signal === 'BUY').length
		const sell = available.filter((item) => item.signal === 'SELL').length
		const neutral = available.length - buy - sell
		const alignment = buy > sell * 2 ? 'strong_bullish' : sell > buy * 2 ? 'strong_bearish' : 'mixed'
		return response.json({ symbol: request.params.symbol.toUpperCase(), market, matrix, alignment, alignment_score: available.length ? Number((Math.max(buy, sell) / available.length).toFixed(2)) : null, consensus: { buy, neutral, sell, overall: buy > sell ? 'BUY' : sell > buy ? 'SELL' : 'NEUTRAL' }, disclaimer: 'المصفوفة وصف لحالة المؤشرات المتاحة وليست توصية استثمارية.' })
	} catch {
		return response.status(502).json({ status: 'error', message: 'تعذر بناء مصفوفة الأطر الزمنية' })
	}
})

analysisRoutes.get('/:symbol/harmonic', async (request, response) => {
	try {
		const series = await resolveAnalysisSeries(request)
		const complete = series.candles.map((candle) => ({ open: Number(candle.open ?? candle.close), high: Number(candle.high ?? candle.close), low: Number(candle.low ?? candle.close), close: Number(candle.close), volume: Number(candle.volume ?? 0) }))
		const data = analyzeHarmonic(complete)
		return response.json({ status: data.status, data, source: series.source, candles_count: series.count, data_quality: series.data_quality })
	} catch {
		return response.status(502).json({ status: 'error', message: 'تعذر تنفيذ Harmonic' })
	}
})
