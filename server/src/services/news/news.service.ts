type NewsItem = {
	id: string
	title: string
	description: string
	summary: string
	url: string
	source: string
	publishedAt: string
	category: string
	symbols: string[]
	sentiment: {
		label: 'positive' | 'negative' | 'neutral'
		score: number
		model?: string
	}
}
const feeds: Record<string, string> = {
	Mubasher:
		process.env.NEWS_RSS_MUBASHER ??
		'https://www.mubasher.info/countries/eg/rss',
	Argaam: process.env.NEWS_RSS_ARGAAM ?? 'https://www.argaam.com/ar/rss',
	Enterprise:
		process.env.NEWS_RSS_ENTERPRISE ?? 'https://enterprise.press/feed/',
	'البورصة المصرية':
		process.env.NEWS_RSS_EGX ?? 'https://www.egx.com.eg/en/rss.aspx',
	'Investing.com عربي':
		process.env.NEWS_RSS_INVESTING ??
		'https://ar.investing.com/rss/news_25.rss',
}
const symbols = [
	'COMI',
	'ABUK',
	'ETEL',
	'SWDY',
	'TMGH',
	'ORAS',
	'MFPC',
	'EKHO',
	'HRHO',
	'2222',
	'1120',
]
const positive = [
	'ارتفاع',
	'نمو',
	'أرباح',
	'توزيع',
	'توسع',
	'صعود',
	'إيجابي',
	'شراء',
]
const negative = [
	'هبوط',
	'خسائر',
	'تراجع',
	'انخفاض',
	'تحذير',
	'أزمة',
	'بيع',
	'سلبي',
]
function strip(value: string) {
	return value
		.replace(/<!\[CDATA\[|\]\]>/g, '')
		.replace(/<[^>]*>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.trim()
}
function tag(xml: string, name: string) {
	return strip(
		xml.match(
			new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'),
		)?.[1] ?? '',
	)
}
function analyze(text: string) {
	const words = text.split(/\s+/)
	const pos = words.filter((word) =>
		positive.some((item) => word.includes(item)),
	).length
	const neg = words.filter((word) =>
		negative.some((item) => word.includes(item)),
	).length
	const label = pos > neg ? 'positive' : neg > pos ? 'negative' : 'neutral'
	return {
		label,
		score: Number(
			Math.min(
				1,
				(Math.abs(pos - neg) / Math.max(words.length, 1)) * 5,
			).toFixed(3),
		),
	} as const
}
function linkSymbols(text: string) {
	const upper = text.toUpperCase()
	return symbols.filter((symbol) => upper.includes(symbol))
}
function summary(title: string, description: string) {
	const clean = description || title
	const sentences = clean
		.split(/[.!؟؛]/)
		.map((part) => part.trim())
		.filter(Boolean)
	return `${sentences[0] ?? title}. ${sentences[1] ?? 'يرجى الرجوع إلى الرابط الأصلي للتفاصيل.'}`
}
async function aiSentiment(text: string) {
	const base = (process.env.PYTHON_SERVICE_URL ?? '').replace(/\/$/, '')
	if (base) {
		try {
			const result = await fetch(`${base}/analyze/sentiment`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text }),
				signal: AbortSignal.timeout(3000),
			})
			if (result.ok) {
				const data = (await result.json()) as any
				if (data?.data?.label)
					return {
						label: data.data.label,
						score: Number(data.data.score ?? 0),
						model: data.data.model,
					}
			}
		} catch {
			/* use deterministic fallback */
		}
	}
	return { ...analyze(text), model: 'arabic-lexicon-fallback' }
}

export class NewsService {
	static async list(
		filters: { symbol?: string; category?: string; limit?: number } = {},
	) {
		const items: NewsItem[] = []
		await Promise.all(
			Object.entries(feeds).map(async ([source, url]) => {
				try {
					const response = await fetch(url, {
						headers: { 'User-Agent': 'Borsaty/1.0' },
						signal: AbortSignal.timeout(8000),
					})
					if (!response.ok) return
					const xml = await response.text()
					const entries = [
						...xml.matchAll(/<(item|entry)[^>]*>([\s\S]*?)<\/(item|entry)>/gi),
					]
					for (const [, , body] of entries.slice(0, 12)) {
						const title = tag(body, 'title')
						const description = tag(body, 'description') || tag(body, 'summary')
						const urlValue = tag(body, 'link') || tag(body, 'guid')
						if (!title || !urlValue) continue
						const text = `${title} ${description}`
						const linked = linkSymbols(text)
						items.push({
							id: `${source}-${urlValue}`,
							title,
							description,
							summary: summary(title, description),
							url: urlValue,
							source,
							publishedAt:
								tag(body, 'pubDate') ||
								tag(body, 'published') ||
								new Date().toISOString(),
							category: /فائدة|تضخم|اقتصاد|نمو|GDP/i.test(text)
								? 'اقتصاد'
								: /شركة|أرباح|سهم|توزيع/i.test(text)
									? 'شركات'
									: 'عام',
							symbols: linked,
							sentiment: await aiSentiment(text),
						})
					}
				} catch {
					/* source unavailable: keep other feeds */
				}
			}),
		)
		return items
			.filter(
				(item) =>
					(!filters.symbol ||
						item.symbols.includes(filters.symbol.toUpperCase())) &&
					(!filters.category || item.category === filters.category),
			)
			.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
			.slice(0, Math.min(filters.limit ?? 50, 100))
	}
}
