import { CandlesService } from '../market/candles.service.js'
import { NewsService } from '../news/news.service.js'

type CommandResult = {
	intent: string
	text: string
	action?: Record<string, unknown>
	symbol?: string
}
const symbols = ['COMI', 'ABUK', 'ETEL', 'SWDY', 'TMGH', 'ORAS', 'MFPC', 'EKHO']
async function quickly<T>(
	promise: Promise<T>,
	fallback: T,
	timeoutMs = 5000,
): Promise<T> {
	return Promise.race([
		promise.catch(() => fallback),
		new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
	])
}

export async function handleVoiceCommand(
	text: string,
	userId?: string,
): Promise<CommandResult> {
	const normalized = text.trim().toUpperCase()
	const symbol = symbols.find((item) => normalized.includes(item))
	if (
		normalized.includes('أفضل') ||
		normalized.includes('افضل') ||
		normalized.includes('TOP 5')
	) {
		return {
			intent: 'MARKET_TOP',
			text: 'أفضل الأسهم المتاحة للمراجعة التعليمية اليوم هي COMI وABUK وETEL وSWDY وTMGH. راجع المخاطر والبيانات قبل أي قرار.',
			action: { type: 'SHOW_STOCKS', symbols },
		}
	}
	if (
		normalized.includes('أخبار') ||
		normalized.includes('اخبار') ||
		normalized.includes('NEWS')
	) {
		const news = await quickly(NewsService.list({ limit: 5 }), [], 4000)
		return {
			intent: 'MARKET_NEWS',
			text: news.length
				? news.map((item) => item.title).join(' — ')
				: 'لا تتوفر أخبار حديثة حالياً.',
			action: { type: 'SHOW_NEWS', count: news.length },
		}
	}
	if (normalized.includes('تنبيه') || normalized.includes('ALERT')) {
		const match = normalized.match(/([A-Z]{2,6}|\d{4})[^\d]*(\d+(?:\.\d+)?)/)
		return {
			intent: 'CREATE_ALERT',
			symbol: match?.[1] ?? symbol,
			text: userId
				? 'تم فهم طلب التنبيه. راجع شاشة التنبيهات لتأكيد الشرط قبل تفعيله.'
				: 'سجّل الدخول لتأكيد التنبيه.',
			action: {
				type: 'CREATE_ALERT_DRAFT',
				symbol: match?.[1] ?? symbol,
				target: match?.[2] ? Number(match[2]) : null,
				requiresAuth: !userId,
			},
		}
	}
	if (
		normalized.includes('أضف') ||
		normalized.includes('اضف') ||
		normalized.includes('WATCHLIST')
	) {
		return {
			intent: 'ADD_WATCHLIST',
			symbol,
			text: symbol
				? `تم فهم طلب إضافة ${symbol} إلى قائمتك. أكمل من صفحة السهم لحفظه.`
				: 'اذكر رمز السهم المطلوب إضافته.',
			action: { type: 'ADD_WATCHLIST_DRAFT', symbol, requiresAuth: !userId },
		}
	}
	if (symbol) {
		const candles = await quickly(
			CandlesService.getCandles(symbol, 'EGX', '1d', 2),
			{ candles: [] } as any,
			4000,
		)
		const latest = candles.candles.at(-1)?.close
		const previous = candles.candles.at(-2)?.close
		const change =
			latest && previous ? ((latest - previous) / previous) * 100 : null
		return {
			intent: 'STOCK_OPINION',
			symbol,
			text: latest
				? `${symbol} يتداول قرب ${latest.toFixed(2)}، والتغير التقريبي ${change?.toFixed(2) ?? '—'}%. هذه قراءة تعليمية وليست توصية.`
				: `لا تتوفر بيانات كافية عن ${symbol} حالياً.`,
			action: { type: 'OPEN_STOCK', symbol },
		}
	}
	return {
		intent: 'UNKNOWN',
		text: 'أستطيع مساعدتك في قراءة سهم، عرض أفضل خمسة أسهم، الأخبار، إعداد تنبيه، أو فتح قائمتك.',
		action: { type: 'SUGGEST_COMMANDS' },
	}
}
