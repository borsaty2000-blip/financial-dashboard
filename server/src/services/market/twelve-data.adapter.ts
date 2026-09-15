import { prisma } from '../../lib/prisma.js'

export type TwelveCompany = {
	symbol: string
	displaySymbol?: string
	name: string
	currency: string
	exchange: string
	micCode: string | null
	country: string | null
	type: string | null
	figiCode: string | null
}

type TwelveDirectoryResponse = {
	data?: Array<{
		symbol?: unknown
		name?: unknown
		currency?: unknown
		exchange?: unknown
		mic_code?: unknown
		country?: unknown
		type?: unknown
		figi_code?: unknown
	}>
}

type CompanyCache = { expiresAt: number; companies: TwelveCompany[] }
const directoryCache = new Map<string, CompanyCache>()
const DIRECTORY_CACHE_TTL_MS = 24 * 60 * 60 * 1_000

const egxAliases: Record<string, string[]> = {
	COMI: ['commercial international bank'],
	ABUK: ['abu qir', 'abou kir'],
	ETEL: ['telecom egypt'],
	SWDY: ['el sewedy', 'elsewedy', 'sweedy electric'],
	TMGH: ['talaat mostafa', 'tmg holding'],
	ORAS: ['orascom construction'],
	MFPC: ['misr fertilizers production', 'mopco'],
	EKHO: ['egyptian kuwaiti'],
	HRHO: ['efg holding', 'hermes holding'],
	EFIH: ['e-finance', 'efinance'],
}

function requiredKey() {
	const key = process.env.TWELVE_DATA_API_KEY?.trim()
	if (!key) throw new Error('TWELVE_DATA_API_KEY is not configured')
	return key
}

function normalizeCompany(
	item: NonNullable<TwelveDirectoryResponse['data']>[number],
): TwelveCompany | null {
	if (typeof item.symbol !== 'string' || typeof item.name !== 'string')
		return null
	return {
		symbol: item.symbol.toUpperCase(),
		name: item.name,
		currency: typeof item.currency === 'string' ? item.currency : 'EGP',
		exchange: typeof item.exchange === 'string' ? item.exchange : 'EGX',
		micCode: typeof item.mic_code === 'string' ? item.mic_code : null,
		country: typeof item.country === 'string' ? item.country : null,
		type: typeof item.type === 'string' ? item.type : null,
		figiCode: typeof item.figi_code === 'string' ? item.figi_code : null,
	}
}

function displaySymbolFor(company: TwelveCompany): string | undefined {
	const name = company.name.toLowerCase()
	return Object.entries(egxAliases).find(([, aliases]) =>
		aliases.some((alias) => name.includes(alias)),
	)?.[0]
}

async function getCompaniesByExchange(
	exchange: 'XCAI' | 'XSAU',
): Promise<TwelveCompany[]> {
	const cached = directoryCache.get(exchange)
	if (cached && cached.expiresAt > Date.now()) return cached.companies
	const key = requiredKey()
	const response = await fetch(
		`https://api.twelvedata.com/stocks?exchange=${exchange}&apikey=${encodeURIComponent(key)}`,
		{ signal: AbortSignal.timeout(10_000) },
	)
	if (!response.ok)
		throw new Error(`Twelve Data ${exchange} directory HTTP ${response.status}`)
	const payload = (await response.json()) as TwelveDirectoryResponse
	const companies = (payload.data ?? [])
		.map(normalizeCompany)
		.filter((company): company is TwelveCompany => company !== null)
		.map((company) => {
			const displaySymbol =
				exchange === 'XCAI' ? displaySymbolFor(company) : undefined
			return displaySymbol ? { ...company, displaySymbol } : company
		})
	if (!companies.length)
		throw new Error(`Twelve Data returned no ${exchange} companies`)
	directoryCache.set(exchange, {
		companies,
		expiresAt: Date.now() + DIRECTORY_CACHE_TTL_MS,
	})
	return companies
}

export function getEgyptCompanies(): Promise<TwelveCompany[]> {
	return getEgyptCompaniesFromCatalog()
}

async function getEgyptCompaniesFromCatalog(): Promise<TwelveCompany[]> {
	const catalog = await prisma.egxCompany
		.findMany({ where: { market: 'EGX' }, orderBy: { symbol: 'asc' } })
		.catch(() => [])
	if (catalog.length) {
		return catalog.map((company) => ({
			symbol: company.symbol,
			displaySymbol: company.symbol,
			name: company.nameAr,
			currency: 'EGP',
			exchange: 'EGX',
			micCode: 'XCAI',
			country: 'Egypt',
			type: 'Common Stock',
			figiCode: null,
		}))
	}
	return getCompaniesByExchange('XCAI')
}

export function getSaudiCompanies(): Promise<TwelveCompany[]> {
	return getSaudiCompaniesFromCatalog()
}
async function getSaudiCompaniesFromCatalog(): Promise<TwelveCompany[]> {
	const catalog = await prisma.tasiCompany
		.findMany({ where: { market: 'TASI' }, orderBy: { symbol: 'asc' } })
		.catch(() => [])
	if (catalog.length) {
		return catalog.map((company) => ({
			symbol: company.symbol,
			displaySymbol: company.symbol,
			name: company.nameAr,
			currency: 'SAR',
			exchange: 'TASI',
			micCode: 'XSAU',
			country: 'Saudi Arabia',
			type: 'Common Stock',
			figiCode: null,
		}))
	}
	return getCompaniesByExchange('XSAU')
}

export async function resolveEgyptSymbol(input: string): Promise<string> {
	const normalized = input.trim().toUpperCase()
	if (!normalized) throw new Error('Symbol is required')
	if (!process.env.TWELVE_DATA_API_KEY?.trim()) return normalized
	const companies = await getEgyptCompanies()
	const direct = companies.find((company) => company.symbol === normalized)
	if (direct?.displaySymbol) return direct.displaySymbol
	if (direct) return direct.symbol
	const aliases = egxAliases[normalized] ?? []
	const match = companies.find((company) => {
		const name = company.name.toLowerCase()
		return aliases.some((alias) => name.includes(alias))
	})
	return match?.displaySymbol ?? match?.symbol ?? normalized
}

export function clearTwelveDirectoryCacheForTest() {
	directoryCache.clear()
}
