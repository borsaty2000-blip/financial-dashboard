import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
	portfolioReport,
	stockReport,
	weeklyReport,
} from '../services/reports/pdf.service.js'
export const reportsRoutes = Router()
async function sendPdf(
	response: any,
	promise: Promise<Buffer>,
	filename: string,
) {
	try {
		const buffer = await promise
		response.setHeader('Content-Type', 'application/pdf')
		response.setHeader(
			'Content-Disposition',
			`attachment; filename="${filename}"`,
		)
		response.send(buffer)
	} catch (error) {
		response
			.status(503)
			.json({
				error: error instanceof Error ? error.message : 'تعذر إنشاء التقرير',
			})
	}
}
reportsRoutes.get('/stock/:symbol/pdf', (request, response) =>
	sendPdf(
		response,
		stockReport(
			request.params.symbol,
			request.query.market === 'TASI' || request.query.market === 'GLOBAL'
				? request.query.market
				: 'EGX',
		),
		`${request.params.symbol.toUpperCase()}-Analysis-${new Date().toISOString().slice(0, 10)}.pdf`,
	),
)
reportsRoutes.get('/portfolio/pdf', requireAuth, (request, response) =>
	sendPdf(response, portfolioReport(request.userId!), 'borsaty-portfolio.pdf'),
)
reportsRoutes.get('/weekly/pdf', requireAuth, (request, response) =>
	sendPdf(response, weeklyReport(request.userId!), 'borsaty-weekly-digest.pdf'),
)
