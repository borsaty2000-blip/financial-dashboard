import PDFDocument from 'pdfkit'
import fs from 'node:fs'
import { CandlesService } from '../market/candles.service.js'
import { getPortfolioValue } from '../trading.service.js'
import { buildWeeklyDigest } from './weekly.service.js'
const font = [
	'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
	'/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
].find(fs.existsSync)
function documentBuffer(write: (doc: PDFKit.PDFDocument) => void) {
	return new Promise<Buffer>((resolve) => {
		const doc = new PDFDocument({ margin: 48 })
		if (font) doc.font(font)
		const chunks: Buffer[] = []
		doc.on('data', (chunk) => chunks.push(chunk))
		doc.on('end', () => resolve(Buffer.concat(chunks)))
		write(doc)
		doc.end()
	})
}
function value(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value)
		? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
		: '—'
}
export async function stockReport(symbol: string) {
	const candles = await CandlesService.getCandles(
		symbol.toUpperCase(),
		'EGX',
		'1d',
		90,
	)
	const latest = candles.candles.at(-1)
	const previous = candles.candles.at(-2)
	const change =
		latest && previous
			? ((latest.close - previous.close) / previous.close) * 100
			: null
	return documentBuffer((doc) => {
		doc.fontSize(22).text(`Borsaty — Stock Analysis: ${symbol.toUpperCase()}`)
		doc.moveDown()
		doc
			.fontSize(12)
			.text(`Price: ${value(latest?.close)}    Change: ${value(change)}%`)
		doc.text(
			`Open: ${value(latest?.open)}   High: ${value(latest?.high)}   Low: ${value(latest?.low)}   Volume: ${value(latest?.volume)}`,
		)
		doc.moveDown()
		doc.fontSize(14).text('Available historical data')
		doc
			.fontSize(10)
			.text(
				`Candles: ${candles.candles.length} | Freshness: ${candles.freshness ?? 'unknown'}`,
			)
		doc.moveDown()
		doc.text(
			'Technical analysis is educational and is not investment advice. Values are shown only when supplied by an available market source.',
		)
	})
}
export async function portfolioReport(userId: string) {
	const portfolio = await getPortfolioValue(userId)
	return documentBuffer((doc) => {
		doc.fontSize(22).text('Borsaty — Portfolio Report')
		doc.moveDown()
		doc.fontSize(13).text(`Total value: ${value(portfolio?.totalValue)}`)
		doc.text(`Cash: ${value(portfolio?.balance)}`)
		doc.text(`P&L: ${value(portfolio?.pnl)}%`)
		doc.moveDown()
		doc.text(
			'Risk metrics are available from the portfolio analytics page when enough history exists.',
		)
		doc.moveDown()
		doc.text('Educational paper-trading report — not investment advice.')
	})
}
export async function weeklyReport(userId: string) {
	const digest = await buildWeeklyDigest(userId)
	return documentBuffer((doc) => {
		doc.fontSize(22).text('Borsaty — Weekly Digest')
		doc.moveDown()
		doc.fontSize(12).text(`Period: ${digest.period}`)
		doc.text(`Opportunities: ${digest.opportunities.length}`)
		doc.text(`Active risks: ${digest.risks.length}`)
		doc.moveDown()
		doc.fontSize(14).text('Opportunities')
		digest.opportunities.forEach((item) =>
			doc.fontSize(10).text(`${item.symbol}: ${value(item.changePercent)}%`),
		)
		doc.moveDown()
		doc.fontSize(10).text(digest.disclaimer)
	})
}
