import PDFDocument from 'pdfkit'
import fs from 'node:fs'
import { CandlesService } from '../market/candles.service.js'
import { getPortfolioValue } from '../trading.service.js'
import { buildWeeklyDigest } from './weekly.service.js'
import { analyzeElliott } from '../analysis/elliott.python.js'
import { analyzeGann } from '../analysis/gann.python.js'
import { calculateIndicatorSnapshot } from '../analysis/indicators.service.js'

const font = [
	'/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
	'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
].find(fs.existsSync)

function documentBuffer(write: (doc: PDFKit.PDFDocument) => void) {
	return new Promise<Buffer>((resolve, reject) => {
		const doc = new PDFDocument({ margin: 48, autoFirstPage: true })
		if (font) doc.font(font)
		const chunks: Buffer[] = []
		doc.on('data', (chunk) => chunks.push(chunk))
		doc.on('end', () => resolve(Buffer.concat(chunks)))
		doc.on('error', reject)
		write(doc)
		doc.end()
	})
}

function value(input: unknown) {
	return typeof input === 'number' && Number.isFinite(input)
		? input.toLocaleString('en-US', { maximumFractionDigits: 2 })
		: '—'
}

function rtl(doc: PDFKit.PDFDocument, text: string, size = 11) {
	doc.fontSize(size).text(text, { align: 'right' })
}

function page(doc: PDFKit.PDFDocument, number: number, title: string) {
	if (number > 1) doc.addPage()
	rtl(doc, `BorsatyAI — ${title}`, 20)
	rtl(doc, `صفحة ${number} من 11`, 9)
	doc.moveDown()
}

export async function stockReport(symbol: string, market: 'EGX' | 'TASI' | 'GLOBAL' = 'EGX') {
	const candles = await CandlesService.getCandles(symbol.toUpperCase(), market, '1d', 250)
	const latest = candles.candles.at(-1)
	const previous = candles.candles.at(-2)
	const change = latest && previous ? ((latest.close - previous.close) / previous.close) * 100 : null
	const prices = candles.candles.map((candle) => candle.close)
	const dates = candles.candles.map((candle) => candle.date)
	const [elliott, gann] = await Promise.all([
		prices.length >= 3 ? analyzeElliott(prices) : Promise.resolve({ status: 'unavailable' }),
		prices.length >= 3 ? analyzeGann(prices, dates) : Promise.resolve({ status: 'unavailable' }),
	])
	const indicators = calculateIndicatorSnapshot(symbol.toUpperCase(), candles.candles)
	return documentBuffer((doc) => {
		page(doc, 1, 'تقرير التحليل العربي')
		rtl(doc, `السهم: ${symbol.toUpperCase()} — السوق: ${market}`, 16)
		rtl(doc, `السعر الأخير: ${value(latest?.close)} | التغير: ${value(change)}%`)
		rtl(doc, 'تقرير تحليلي تعليمي — ليس توصية استثمارية.', 10)

		page(doc, 2, 'الخلاصة التنفيذية')
		rtl(doc, `البيانات المتاحة: ${candles.candles.length} شمعة.`)
		rtl(doc, `التحليل Elliott: ${String((elliott as Record<string, unknown>).status ?? 'متاح')}`)
		rtl(doc, `التحليل Gann: ${String((gann as Record<string, unknown>).status ?? 'متاح')}`)
		rtl(doc, 'لا يتم إصدار أمر شراء أو بيع؛ القرار مسؤولية المستخدم بعد المراجعة.', 10)

		page(doc, 3, 'الأطر الزمنية')
		for (const timeframe of ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M', 'Quarterly', 'Yearly'])
			rtl(doc, `${timeframe}: لا تُعرض نتيجة غير مدعومة ببيانات هذا الإطار.`, 10)

		page(doc, 4, 'Elliott Wave')
		const elliottData = (elliott as Record<string, any>).data ?? elliott
		rtl(doc, `الموجة الحالية: ${String(elliottData?.current_wave?.label ?? 'غير متاحة')}`)
		rtl(doc, `الثقة: ${value(elliottData?.confidence_percent ?? elliottData?.confidence)}`)
		rtl(doc, `الأهداف: ${JSON.stringify(elliottData?.targets ?? {})}`)
		rtl(doc, `الإبطال: ${JSON.stringify(elliottData?.invalidation ?? {})}`)

		page(doc, 5, 'Gann Analysis')
		const gannData = (gann as Record<string, any>).data ?? gann
		rtl(doc, `الاتجاه: ${String(gannData?.trend ?? 'غير متاح')}`)
		rtl(doc, `النطاق: ${value(gannData?.range)}`)
		rtl(doc, `الزوايا: ${JSON.stringify(gannData?.angles ?? {})}`)
		rtl(doc, `Square of Nine: ${JSON.stringify(gannData?.square_of_nine ?? {})}`)

		page(doc, 6, 'Fibonacci')
		rtl(doc, 'يتم عرض علاقات Fibonacci فقط عندما تتوفر نقاط تأرجح مؤكدة.')
		rtl(doc, `علاقات Elliott: ${JSON.stringify(elliottData?.relationships ?? {})}`)

		page(doc, 7, 'Harmonic + Classical')
		rtl(doc, 'لم يتم تضمين نموذج Harmonic غير مؤكد في التقرير.')
		rtl(doc, 'النماذج الكلاسيكية تحتاج نقاط OHLC مؤكدة ولا تُستبدل بتخمينات.')

		page(doc, 8, 'المؤشرات الفنية')
		rtl(doc, JSON.stringify(indicators))

		page(doc, 9, 'الدعم والمقاومة')
		rtl(doc, `أعلى سعر في العينة: ${value(Math.max(...candles.candles.map((candle) => candle.high)))}`)
		rtl(doc, `أدنى سعر في العينة: ${value(Math.min(...candles.candles.map((candle) => candle.low)))}`)
		rtl(doc, `آخر إغلاق: ${value(latest?.close)}`)

		page(doc, 10, 'الحجم وقوة المشترين')
		rtl(doc, `الحجم الأخير: ${value(latest?.volume)}`)
		rtl(doc, 'لا يتم اشتقاق قوة المشترين من بيانات غير متاحة أو من دفتر أوامر غير موفر.', 10)

		page(doc, 11, 'جودة البيانات والإخلاء')
		rtl(doc, `المزود: ${candles.source}`)
		rtl(doc, `وقت جلب السلسلة: ${candles.fetched_at}`)
		rtl(doc, `حالة الجودة: ${candles.data_quality.status}`)
		rtl(doc, `عمر البيانات بالثواني: ${value(candles.data_quality.age_seconds)}`)
		rtl(doc, 'لا تُصنّف البيانات المتأخرة على أنها لحظية. التقرير تعليمي وليس نصيحة مالية أو ضماناً للنتيجة.', 10)
	})
}

export async function portfolioReport(userId: string) {
	const portfolio = await getPortfolioValue(userId)
	return documentBuffer((doc) => {
		rtl(doc, 'BorsatyAI — تقرير المحفظة', 20)
		rtl(doc, `القيمة الإجمالية: ${value(portfolio?.totalValue)}`)
		rtl(doc, `النقد: ${value(portfolio?.balance)}`)
		rtl(doc, `الربح والخسارة: ${value(portfolio?.pnl)}%`)
		rtl(doc, 'تقرير محاكاة تعليمية — ليس نصيحة استثمارية.', 10)
	})
}

export async function weeklyReport(userId: string) {
	const digest = await buildWeeklyDigest(userId)
	return documentBuffer((doc) => {
		rtl(doc, 'BorsatyAI — الملخص الأسبوعي', 20)
		rtl(doc, `الفترة: ${digest.period}`)
		rtl(doc, `الفرص: ${digest.opportunities.length}`)
		rtl(doc, `المخاطر: ${digest.risks.length}`)
		rtl(doc, digest.disclaimer, 10)
	})
}
