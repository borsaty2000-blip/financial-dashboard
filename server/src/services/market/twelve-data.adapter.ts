export type TwelveCompany = {
	symbol: string
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
let egyptCompaniesCache: CompanyCache | null = null
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

export async function getEgyptCompanies(): Promise<TwelveCompany[]> {
	if (egyptCompaniesCache && egyptCompaniesCache.expiresAt > Date.now())
		return egyptCompaniesCache.companies
	const key = requiredKey()
	const response = await fetch(
		`https://api.twelvedata.com/stocks?exchange=XCAI&apikey=${encodeURIComponent(key)}`,
		{ signal: AbortSignal.timeout(10_000) },
	)
	if (!response.ok)
		throw new Error(`Twelve Data directory HTTP ${response.status}`)
	const payload = (await response.json()) as TwelveDirectoryResponse
	const companies = (payload.data ?? [])
		.map(normalizeCompany)
		.filter((company): company is TwelveCompany => company !== null)
	if (!companies.length)
		throw new Error('Twelve Data returned no EGX companies')
	egyptCompaniesCache = {
		companies,
		expiresAt: Date.now() + DIRECTORY_CACHE_TTL_MS,
	}
	return companies
}

export async function resolveEgyptSymbol(input: string): Promise<string> {
	const normalized = input.trim().toUpperCase()
	if (!normalized) throw new Error('Symbol is required')
	if (/^EGS[A-Z0-9]+$/u.test(normalized)) return normalized
	const companies = await getEgyptCompanies()
	const direct = companies.find((company) => company.symbol === normalized)
	if (direct) return direct.symbol
	const aliases = egxAliases[normalized] ?? []
	const match = companies.find((company) => {
		const name = company.name.toLowerCase()
		return aliases.some((alias) => name.includes(alias))
	})
	return match?.symbol ?? normalized
}

export function clearTwelveDirectoryCacheForTest() {
	egyptCompaniesCache = null
}
