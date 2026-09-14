import { Router } from 'express'
import { sitemapUrls } from '../services/blog/blog.service.js'
import { marketCatalog } from '../services/regional/regional.service.js'

export const seoRoutes = Router()
const base = () => process.env.FRONTEND_URL ?? 'https://borsatyai.com'
const xml = (urls: string[]) =>
	`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${base()}${url}</loc></url>`).join('')}</urlset>`
seoRoutes.get('/sitemap.xml', async (_req, res) => {
	const staticUrls = [
		'/',
		'/about',
		'/terms',
		'/privacy',
		'/disclaimer',
		'/education',
		'/community',
		'/blog',
		'/help',
		'/support',
		'/markets/forex',
		'/markets/commodities',
		'/markets/crypto',
		'/markets/etf',
		'/markets/bonds',
		...marketCatalog.map((market) => `/markets/${market.code.toLowerCase()}`),
	]
	res
		.type('application/xml')
		.send(xml([...staticUrls, ...(await sitemapUrls())]))
})
seoRoutes.get('/sitemap-blog.xml', async (_req, res) =>
	res.type('application/xml').send(xml(await sitemapUrls())),
)
seoRoutes.get('/sitemap-stocks.xml', (_req, res) =>
	res
		.type('application/xml')
		.send(
			xml([
				'/stock/COMI',
				'/stock/ETEL',
				'/stock/ABUK',
				'/stock/2222',
				'/stock/1120',
			]),
		),
)
seoRoutes.get('/robots.txt', (_req, res) =>
	res
		.type('text/plain')
		.send(
			`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /settings/\nDisallow: /developer/\nSitemap: ${base()}/sitemap.xml\nSitemap: ${base()}/sitemap-blog.xml\nSitemap: ${base()}/sitemap-stocks.xml\n`,
		),
)
