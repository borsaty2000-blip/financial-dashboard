import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import {
	CandlesService,
	type CandleMarket,
} from '../services/market/candles.service.js'
import {
	getSaudiCompanies,
	type TwelveCompany,
} from '../services/market/twelve-data.adapter.js'

export const stockRoutes = Router()

const marketFor = (identifier: string): CandleMarket =>
	/^\d{4,5}$/u.test(identifier) ? 'TASI' : 'EGX'

const companyPayload = (company: {
	symbol: string
	name: string
	nameAr?: string
	market: string
	currency?: string
	sourceCode?: string
}) => ({
	symbol: company.symbol,
	nameAr: company.nameAr ?? company.name,
	nameEn: company.name,
	market: company.market,
	currency: company.currency ?? (company.market === 'EGX' ? 'EGP' : 'SAR'),
	isin: company.sourceCode ?? null,
})

async function findCompany(identifier: string) {
	const normalized = identifier.trim().toUpperCase()
	const egx = await prisma.egxCompany
		.findFirst({
			where: {
				OR: [{ symbol: normalized }, { sourceCode: normalized }],
			},
		})
		.catch(() => null)
	if (egx) return companyPayload({ ...egx, name: egx.nameAr })
	if (marketFor(normalized) === 'TASI') {
		const companies = await getSaudiCompanies().catch(() => [])
		const match = companies.find((item) => item.symbol === normalized)
		if (match) return companyPayload({ ...match, market: 'TASI' })
	}
	return null
}

stockRoutes.get('/:identifier', async (request, response) => {
	const identifier = request.params.identifier.trim().toUpperCase()
	const market = marketFor(identifier)
	const company = await findCompany(identifier)
	const quote = await CandlesService.getQuote(identifier, market).catch(
		() => null,
	)
	if (!company && !quote?.price)
		return response.status(404).json({
			available: false,
			message: 'لم يتم العثور على السهم أو بياناته',
		})
	return response.json({
		available: true,
		...company,
		symbol: company?.symbol ?? quote?.symbol ?? identifier,
		quote,
	})
})

stockRoutes.get('/:symbol/related', async (request, response) => {
	const symbol = request.params.symbol.trim().toUpperCase()
	const market = marketFor(symbol)
	if (market === 'EGX') {
		const rows = await prisma.egxCompany
			.findMany({
				where: { market: 'EGX', symbol: { not: symbol } },
				orderBy: { symbol: 'asc' },
				take: 8,
			})
			.catch(() => [])
		return response.json({
			available: rows.length > 0,
			data: rows.map((row) => companyPayload({ ...row, name: row.nameAr })),
		})
	}
	const companies = await getSaudiCompanies().catch(() => [] as TwelveCompany[])
	return response.json({
		available: companies.length > 1,
		data: companies
			.filter((company) => company.symbol !== symbol)
			.slice(0, 8)
			.map((company) => companyPayload({ ...company, market: 'TASI' })),
	})
})
