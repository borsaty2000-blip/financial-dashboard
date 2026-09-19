import PDFDocument from 'pdfkit'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import reshaper from 'arabic-persian-reshaper'
import bidiFactory from 'bidi-js'
import { CandlesService } from '../market/candles.service.js'
import { getPortfolioValue } from '../trading.service.js'
import { buildWeeklyDigest } from './weekly.service.js'
import { analyzeElliott } from '../analysis/elliott.python.js'
import { analyzeGann } from '../analysis/gann.python.js'
import { calculateIndicatorSnapshot } from '../analysis/indicators.service.js'
import { analyzeHarmonic, calculateConfluence } from '../analysis/confluence.service.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const findAsset = (name: string) => [
	path.join(currentDir, '../../../assets/fonts', name),
	path.join(process.cwd(), 'server/assets/fonts', name),
	path.join(process.cwd(), 'assets/fonts', name),
	path.join('/var/task/server/assets/fonts', name),
	path.join('/usr/share/fonts/truetype/noto', name),
	path.join('/usr/share/fonts/truetype/dejavu', name),
].find(fs.existsSync)
const font = findAsset('Cairo-Regular.ttf') ?? findAsset('NotoSansArabic-Regular.ttf') ?? findAsset('DejaVuSans.ttf')
const boldFont = findAsset('Cairo-Bold.ttf') ?? findAsset('NotoSansArabic-Bold.ttf') ?? font
const latinFont = findAsset('DejaVuSans.ttf') ?? font
const latinBoldFont = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', latinFont ?? ''].find(fs.existsSync) ?? latinFont
const bidi = bidiFactory()

function shapeArabic(value: string) {
	if (!/[\u0600-\u06ff]/.test(value)) return value
	const shaped = reshaper.ArabicShaper.convertArabic(value)
	return bidi.getReorderedString(shaped, bidi.getEmbeddingLevels(shaped, 'rtl'))
}

function documentBuffer(write: (doc: PDFKit.PDFDocument) => void) {
	return new Promise<Buffer>((resolve, reject) => {
		const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, autoFirstPage: true, info: { Title: 'BorsatyAI Analysis Report' } })
		if (font) doc.font(font)
		const chunks: Buffer[] = []
		doc.on('data', (chunk) => chunks.push(chunk))
		doc.on('end', () => resolve(Buffer.concat(chunks)))
		doc.on('error', reject)
		write(doc)
		doc.end()
	})
}

const colors = { ink: '#171b20', muted: '#6a6d78', line: '#e0e3eb', green: '#089981', red: '#f23645', panel: '#f7f8fa', navy: '#202a35' }
function text(doc: PDFKit.PDFDocument, value: unknown, x: number, y: number, width: number, size = 10, color = colors.ink, bold = false) {
	const content = String(value ?? '—')
	const arabic = /[\u0600-\u06ff]/.test(content)
	const mixedWithLatin = /[A-Za-z]/.test(content)
	const selectedFont = mixedWithLatin || !arabic ? (bold && latinBoldFont ? latinBoldFont : latinFont ?? 'Helvetica') : (bold && boldFont ? boldFont : font ?? 'Helvetica')
	doc.font(selectedFont).fontSize(size).fillColor(color).text(arabic ? shapeArabic(content) : content, x, y, { width, align: 'right', lineGap: 0 })
}
function value(input: unknown, digits = 2) {
	return typeof input === 'number' && Number.isFinite(input) ? input.toLocaleString('en-US', { maximumFractionDigits: digits }) : '—'
}
function card(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, title: string) {
	doc.roundedRect(x, y, width, height, 8).fillColor(colors.panel).fill()
	text(doc, title, x + 12, y + 10, width - 24, 12, colors.ink, true)
	doc.strokeColor(colors.line).lineWidth(0.6).roundedRect(x, y, width, height, 8).stroke()
}
function metric(doc: PDFKit.PDFDocument, label: string, valueText: unknown, x: number, y: number, width: number, color = colors.ink) {
	text(doc, label, x, y, width, 8, colors.muted)
	text(doc, valueText, x, y + 13, width, 12, color, true)
}

export async function stockReport(symbol: string, market: 'EGX' | 'TASI' | 'GLOBAL' = 'EGX') {
	const candles = await CandlesService.getCandles(symbol.toUpperCase(), market, '1d', 250)
	const latest = candles.candles.at(-1)
	const previous = candles.candles.at(-2)
	const change = latest && previous && previous.close ? ((latest.close - previous.close) / previous.close) * 100 : null
	const prices = candles.candles.map((candle) => candle.close)
	const dates = candles.candles.map((candle) => candle.date)
	const [elliott, gann] = await Promise.all([
		prices.length >= 30 ? analyzeElliott(prices) : Promise.resolve({ status: 'unavailable' }),
		prices.length >= 30 ? analyzeGann(prices, dates) : Promise.resolve({ status: 'unavailable' }),
	])
	const elliottData = ((elliott as Record<string, any>).data ?? elliott) as Record<string, any>
	const gannData = ((gann as Record<string, any>).data ?? gann) as Record<string, any>
	const indicators = calculateIndicatorSnapshot(symbol.toUpperCase(), candles.candles)
	const harmonic = analyzeHarmonic(candles.candles)
	const confluence = calculateConfluence({ candles: candles.candles, elliott: elliottData, gann: gannData, indicators, harmonic })
	const confluenceScore = confluence.bullish_confluence
	const targets = elliottData?.targets ?? {}
	const currentWave = elliottData?.current_wave?.label ?? elliottData?.current_wave?.number ?? 'غير متاحة'
	const direction = elliottData?.current_wave?.direction === 'up' ? 'صاعد' : elliottData?.current_wave?.direction === 'down' ? 'هابط' : 'غير حاسم'
	const quality = candles.data_quality
	const width = 841.89
	const height = 595.28
	const margin = 28
	return documentBuffer((doc) => {
		doc.rect(0, 0, width, height).fillColor(colors.navy).fill()
		doc.rect(0, 0, width, 7).fillColor(colors.green).fill()
		text(doc, 'borsatyai.com', margin, 22, 160, 10, '#dfe5ec', true)
		text(doc, `تقرير التحليل الموحد · ${new Date().toISOString().slice(0, 10)}`, 330, 22, width - margin - 330, 9, '#dfe5ec')

		const contentTop = 54
		const contentHeight = height - 86
		doc.roundedRect(margin, contentTop, width - margin * 2, contentHeight, 12).fillColor('#ffffff').fill()
		text(doc, symbol.toUpperCase(), margin + 18, contentTop + 16, 180, 22, colors.ink, true)
		text(doc, `${market === 'TASI' ? 'السوق السعودي · SAR' : market === 'GLOBAL' ? 'السوق العالمي · USD' : 'السوق المصري · EGP'}`, margin + 18, contentTop + 44, 240, 10, colors.muted)
		text(doc, value(latest?.close), width - margin - 220, contentTop + 16, 200, 24, colors.ink, true)
		text(doc, `${change == null ? '—' : `${change >= 0 ? '+' : ''}${value(change)}%`}`, width - margin - 220, contentTop + 48, 200, 12, change != null && change >= 0 ? colors.green : colors.red, true)
		text(doc, `المصدر: ${quality.provider ?? candles.source} · الحالة: ${quality.status === 'live' ? 'لحظية' : quality.status === 'historical' ? 'تاريخية' : 'متأخرة'}`, margin + 18, contentTop + 70, width - margin * 2 - 36, 9, colors.muted)
		doc.strokeColor(colors.line).lineWidth(0.8).moveTo(margin + 16, contentTop + 88).lineTo(width - margin - 16, contentTop + 88).stroke()

		const innerY = contentTop + 104
		const gap = 12
		const col = (width - margin * 2 - 32 - gap * 2) / 3
		card(doc, margin + 16, innerY, col, 145, 'الملخص الفني')
		metric(doc, 'الاتجاه', direction, margin + 30, innerY + 38, col - 28, direction === 'صاعد' ? colors.green : direction === 'هابط' ? colors.red : colors.muted)
		metric(doc, 'الموجة الحالية', currentWave, margin + 30, innerY + 70, col - 28)
		metric(doc, 'الإجماع', indicators.recommendation === 'BUY' ? 'شراء' : indicators.recommendation === 'SELL' ? 'بيع' : 'محايد', margin + col / 2, innerY + 38, col / 2 - 22, indicators.recommendation === 'BUY' ? colors.green : indicators.recommendation === 'SELL' ? colors.red : colors.muted)
		metric(doc, 'RSI', value(indicators.rsi?.value), margin + col / 2, innerY + 70, col / 2 - 22)
		metric(doc, 'توافق الأدلة', `${confluenceScore}/100`, margin + 30, innerY + 113, col - 28, confluenceScore >= 60 ? colors.green : confluenceScore <= 40 ? colors.red : colors.muted)

		const x2 = margin + 16 + col + gap
		card(doc, x2, innerY, col, 130, 'الموجات والمستويات الهندسية')
		metric(doc, 'الثقة', elliottData?.confidence_percent == null ? '—' : `${value(elliottData.confidence_percent, 0)}%`, x2 + 14, innerY + 38, col - 28)
		metric(doc, 'الإبطال', value(elliottData?.invalidation?.level), x2 + 14, innerY + 82, col - 28, colors.red)
		metric(doc, 'الدعم الهندسي', value(gannData?.support_resistance?.support ?? gannData?.square_of_nine?.support), x2 + col / 2, innerY + 38, col / 2 - 22, colors.green)
		metric(doc, 'المقاومة الهندسية', value(gannData?.support_resistance?.resistance ?? gannData?.square_of_nine?.resistance), x2 + col / 2, innerY + 82, col / 2 - 22, colors.red)

		const x3 = x2 + col + gap
		card(doc, x3, innerY, col, 130, 'الأهداف والمخاطر')
		metric(doc, 'الهدف 1', value(targets.target_1?.price), x3 + 14, innerY + 38, col - 28, colors.green)
		metric(doc, 'الهدف 2', value(targets.target_2?.price), x3 + 14, innerY + 82, col - 28, colors.green)
		metric(doc, 'الهدف 3', value(targets.target_3?.price), x3 + col / 2, innerY + 38, col / 2 - 22, colors.green)
		metric(doc, 'عدد الشموع', candles.count, x3 + col / 2, innerY + 82, col / 2 - 22)

		const lowerY = innerY + 158
		card(doc, margin + 16, lowerY, width - margin * 2 - 32, 78, 'الأطر الزمنية وجودة البيانات')
		const labels = ['5 دقائق', '15 دقيقة', '1 ساعة', 'يومي', 'أسبوعي']
		labels.forEach((label, index) => metric(doc, label, index === 3 ? (indicators.recommendation === 'BUY' ? 'شراء' : indicators.recommendation === 'SELL' ? 'بيع' : 'محايد') : 'غير متاح', margin + 32 + index * 145, lowerY + 32, 120, index === 3 && indicators.recommendation === 'BUY' ? colors.green : colors.muted))
		text(doc, `وقت الجلب: ${candles.fetched_at} · عمر البيانات: ${quality.age_seconds == null ? 'غير معروف' : `${value(quality.age_seconds, 0)} ثانية`}`, margin + 30, lowerY + 61, width - margin * 2 - 60, 8, colors.muted)

		const footerY = lowerY + 92
		text(doc, 'إخلاء المسؤولية: تقرير تعليمي وتحليلي فقط، وليس توصية شراء أو بيع أو ضماناً للنتيجة.', margin + 18, footerY, width - margin * 2 - 36, 9, colors.muted)
		text(doc, 'القرار النهائي مسؤولية المستخدم بعد مراجعة البيانات والمخاطر ومصدرها.', margin + 18, footerY + 16, width - margin * 2 - 36, 9, colors.muted)
	})
}

export async function portfolioReport(userId: string) {
	const portfolio = await getPortfolioValue(userId)
	return documentBuffer((doc) => {
		text(doc, 'borsatyai.com — تقرير المحفظة', 40, 40, 760, 20, colors.ink, true)
		text(doc, `القيمة الإجمالية: ${value(portfolio?.totalValue)}`, 40, 100, 760, 14)
		text(doc, `النقد: ${value(portfolio?.balance)}`, 40, 130, 760, 14)
		text(doc, `الربح والخسارة: ${value(portfolio?.pnl)}%`, 40, 160, 760, 14)
		text(doc, 'تقرير محاكاة تعليمية — ليس نصيحة مالية.', 40, 220, 760, 10, colors.muted)
	})
}

export async function weeklyReport(userId: string) {
	const digest = await buildWeeklyDigest(userId)
	return documentBuffer((doc) => {
		text(doc, 'borsatyai.com — التقرير الأسبوعي', 40, 40, 760, 20, colors.ink, true)
		text(doc, `الفترة: ${digest.period}`, 40, 100, 760, 14)
		text(doc, `الفرص: ${digest.opportunities.length} · المخاطر: ${digest.risks.length}`, 40, 130, 760, 14)
		text(doc, digest.disclaimer, 40, 200, 760, 10, colors.muted)
	})
}
