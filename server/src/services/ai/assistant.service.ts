import { CandlesService, type CandleMarket } from '../market/candles.service.js'
import { ConsensusService } from '../analysis/consensus.service.js'
import { analyzeElliott } from '../analysis/elliott.python.js'
import { analyzeGann } from '../analysis/gann.python.js'
import { calculateIndicatorSnapshot } from '../analysis/indicators.service.js'
import { getEgyptCompanies } from '../market/twelve-data.adapter.js'

export type AssistantRequest = {
	message: string
	market?: CandleMarket
	symbol?: string
	history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

type AssistantResult = {
	message: string
	symbol?: string
	market?: CandleMarket
	available: boolean
	consensus?: Awaited<ReturnType<typeof ConsensusService.calculate>>
	elliott?: unknown
	gann?: unknown
	indicators?: ReturnType<typeof calculateIndicatorSnapshot>
	stocks?: Array<{ symbol: string; score: number; signal: string }>
	disclaimer: string
}

const DISCLAIMER =
	'هذا التحليل تعليمي فقط، وليس توصية استثمارية أو ضماناً للنتائج، ولا ينفذ أي صفقة.'
const knownSymbols = [
	'COMI',
	'ABUK',
	'ETEL',
	'SWDY',
	'TMGH',
	'ORAS',
	'MFPC',
	'EKHO',
	'HRHO',
	'EFIH',
	'2222',
	'1120',
	'1180',
	'7010',
]

function extractSymbol(message: string, explicit?: string) {
	const candidate = explicit?.trim().toUpperCase()
	if (candidate && /^[A-Z0-9._-]{1,20}$/u.test(candidate)) return candidate
	const upper = message.toUpperCase()
	return knownSymbols.find((symbol) => upper.includes(symbol))
}

function marketFor(
	symbol: string | undefined,
	requested?: CandleMarket,
): CandleMarket {
	if (requested) return requested
	return symbol && /^\d{4,5}$/u.test(symbol) ? 'TASI' : 'EGX'
}

function explainConsensus(score: number, signal: string) {
	return `نتيجة الإجماع التعليمية للرمز هي ${score}/100 (${signal}). اقرأها كسيناريو تحليلي قابل للاختبار، وليس كقرار شراء أو بيع.`
}

function generalAnswer(message: string): string | null {
	if (
		/^(مرحبا|مرحباً|اهلا|أهلاً|السلام عليكم|صباح الخير|مساء الخير)/i.test(
			message,
		)
	)
		return 'أهلاً بك في borsatyai. أنا مساعد عام أستطيع الإجابة عن الأسئلة التعليمية، التقنية، المالية العامة، الأخبار، واستخدام المنصة، ويمكنني أيضاً تحليل الأسهم عند طلب ذلك.'
	if (/من أنت|مين أنت|ماذا تستطيع|مساعد/i.test(message))
		return 'أنا مساعد borsatyai الذكي. أجيب عن الأسئلة العامة وأشرح المفاهيم، أساعدك في استخدام صفحات المنصة، ألخص الأخبار التي تظهر لدينا، وأنتقل إلى تحليل السهم فقط عندما تذكر رمزاً أو تطلب تحليلاً محدداً.'
	if (
		/اشرح|شرح|ما هو|ماهي|ما هي|يعني|كيف يعمل|الفرق بين/i.test(message) &&
		/rsi|macd|فيبوناتشي|فوليوم|حجم التداول|دعم|مقاومة|سهم|بورصة/i.test(message)
	)
		return 'أستطيع شرح هذا المفهوم خطوة بخطوة وبأسلوب مبسط. اكتب اسم المؤشر أو المصطلح كما هو، وسأوضح فكرته، طريقة قراءته، أهم حدوده، ومثالاً تعليمياً دون تحويل الشرح إلى توصية تداول.'
	if (
		/كيف أستخدم|استخدم المنصة|أين أجد|طريقة التسجيل|إنشاء حساب|القائمة|اللغة|مبدل|مبدّل/i.test(
			message,
		)
	)
		return 'يمكنك استخدام القوائم العلوية للوصول إلى الأسواق والتحليل والأخبار والتعليم. اضغط على أي سهم لفتح غرفة التحليل، واستخدم زر borsatyai للمساعد في أي صفحة. تغيير اللغة موجود في الشريط العلوي، ويمكنك إنشاء حساب من زر «ابدأ مجاناً».'
	if (/خبر|أخبار|اقتصاد|فائدة|تضخم|ذهب|فضة|سعودية|مصر/i.test(message))
		return 'أستطيع مساعدتك في فهم الخبر أو الحدث الاقتصادي وتحليل أثره المحتمل تعليمياً. للحصول على معلومة حديثة محددة، اذكر الدولة أو السوق والموضوع، وسأفصل بين ما هو مؤكد في البيانات وما يحتاج إلى تحقق.'
	if (/استثمار|تداول|مخاطر|محفظة|تنويع|إدارة رأس المال/i.test(message))
		return 'القاعدة التعليمية الأهم هي إدارة المخاطر قبل البحث عن العائد: نوّع التعرض، حدّد نسبة مخاطرة مقبولة، لا تعتمد على مؤشر واحد، واختبر الفرضية تاريخياً. لا يقدم borsatyai توصيات مضمونة ولا ينفذ صفقات.'
	if (/شكرا|شكراً|تمام|ممتاز|حسنا|حسنًا/i.test(message))
		return 'على الرحب والسعة. اكتب أي سؤال عام أو اطلب شرحاً لمفهوم أو مساعدة في استخدام borsatyai، وسأجيبك مباشرة.'
	return null
}

export class AIAssistantService {
	static async chat(request: AssistantRequest): Promise<AssistantResult> {
		const message = request.message.trim()
		const symbol = extractSymbol(message, request.symbol)
		if (!message)
			return {
				message: 'اكتب سؤالك أو رمز سهم مثل COMI لأبدأ التحليل.',
				available: false,
				disclaimer: DISCLAIMER,
			}

		if (/أفضل|افضل|أقوى|اقوى/.test(message) && /سهم|أسهم|اسهم/.test(message))
			return this.topStocks(request.market ?? 'EGX')

		if (/السوق|المؤشر/.test(message) && /اليوم|الآن|الان|ملخص/.test(message))
			return {
				message:
					'يمكنك فتح صفحة السوق لرؤية المؤشرات المتاحة حالياً. لا أعرض قيمة غير مؤكدة أو أستبدل البيانات الحية بأرقام تجريبية.',
				available: false,
				market: request.market,
				disclaimer: DISCLAIMER,
			}

		if (/شريعة|حلال|شرعي/.test(message))
			return {
				message:
					'يمكنك استخدام فحص الشريعة من صفحة الأداة. النتيجة تعتمد على البيانات المالية المتاحة ولا تُعد فتوى أو توصية.',
				available: true,
				disclaimer: DISCLAIMER,
			}

		const general = generalAnswer(message)
		if (general)
			return {
				message: general,
				available: false,
				disclaimer: DISCLAIMER,
			}

		if (!symbol)
			return {
				message:
					'اكتب سؤالك بحرية: سؤال عام، شرح مفهوم، مساعدة تقنية، خبر اقتصادي، أو رمز سهم لتحليل تعليمي. لست محصوراً في تحليل الأسهم.',
				available: false,
				disclaimer: DISCLAIMER,
			}

		return this.analyzeStock(symbol, message, marketFor(symbol, request.market))
	}

	private static async analyzeStock(
		symbol: string,
		_question: string,
		market: CandleMarket,
	): Promise<AssistantResult> {
		try {
			const candles = await CandlesService.getCandles(symbol, market, '1d', 250)
			if (!candles.candles.length)
				return {
					message: `لا توجد شموع موثوقة متاحة حالياً للرمز ${symbol}.`,
					symbol,
					market,
					available: false,
					disclaimer: DISCLAIMER,
				}
			const prices = candles.candles.map((candle) => candle.close)
			const dates = candles.candles.map((candle) => candle.date)
			const [consensus, elliott, gann] = await Promise.all([
				ConsensusService.calculate(symbol, prices, dates),
				analyzeElliott(prices).catch(() => null),
				analyzeGann(prices, dates).catch(() => null),
			])
			const indicators = calculateIndicatorSnapshot(
				symbol,
				candles.candles.map((candle) => ({
					open: candle.open,
					high: candle.high,
					low: candle.low,
					close: candle.close,
					volume: candle.volume,
				})),
			)
			return {
				message: `${explainConsensus(consensus.score, consensus.signal)} آخر قيمة موثوقة: ${prices.at(-1)?.toFixed(2) ?? '—'}.`,
				symbol,
				market,
				available: true,
				consensus,
				elliott,
				gann,
				indicators,
				disclaimer: DISCLAIMER,
			}
		} catch {
			return {
				message: `تعذر تشغيل التحليل للرمز ${symbol} حالياً. لم يتم إنشاء قيمة بديلة.`,
				symbol,
				market,
				available: false,
				disclaimer: DISCLAIMER,
			}
		}
	}

	private static async topStocks(
		market: CandleMarket,
	): Promise<AssistantResult> {
		const candidates =
			market === 'TASI'
				? ['2222', '1120', '1180', '7010']
				: knownSymbols.slice(0, 10)
		const results = await Promise.all(
			candidates.map(async (symbol) => {
				try {
					const candles = await CandlesService.getCandles(
						symbol,
						market,
						'1d',
						120,
					)
					if (candles.candles.length < 30) return null
					const consensus = await ConsensusService.calculate(
						symbol,
						candles.candles.map((candle) => candle.close),
					)
					return { symbol, score: consensus.score, signal: consensus.signal }
				} catch {
					return null
				}
			}),
		)
		const stocks = results
			.filter((item): item is NonNullable<typeof item> => item !== null)
			.sort((a, b) => b.score - a.score)
			.slice(0, 5)
		return {
			message: stocks.length
				? 'هذه أعلى نتائج الإجماع من البيانات المتاحة، وليست توصية شراء.'
				: 'لا تتوفر حالياً كمية كافية من الشموع الموثوقة لترتيب الأسهم.',
			market,
			available: stocks.length > 0,
			stocks,
			disclaimer: DISCLAIMER,
		}
	}
}

export async function listAssistantSymbols() {
	try {
		const companies = await getEgyptCompanies()
		return companies.slice(0, 60).map((company) => ({
			symbol: company.symbol,
			name: company.name,
			currency: company.currency,
			price: null,
			available: false,
		}))
	} catch {
		return []
	}
}

export { DISCLAIMER }
