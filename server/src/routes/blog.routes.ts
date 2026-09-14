import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../middleware/auth.js'
import {
	createPost,
	getPost,
	listPosts,
	sitemapUrls,
} from '../services/blog/blog.service.js'
export const blogRoutes = Router()
blogRoutes.get('/blog', async (req, res) =>
	res.json(
		await listPosts(
			typeof req.query.category === 'string' ? req.query.category : undefined,
		),
	),
)
blogRoutes.get('/blog/:slug', async (req, res) => {
	try {
		return res.json(await getPost(req.params.slug))
	} catch {
		return res.status(404).json({ error: 'المقال غير موجود' })
	}
})
blogRoutes.post('/blog', requireAdmin, async (req, res) => {
	const parsed = z
		.object({
			slug: z.string().regex(/^[a-z0-9-]+$/),
			title: z.string().min(3),
			titleEn: z.string().optional(),
			excerpt: z.string().optional(),
			content: z.string().min(30),
			coverImage: z.string().url().optional(),
			category: z.string(),
			tags: z.array(z.string()).default([]),
			seoTitle: z.string().optional(),
			seoDescription: z.string().optional(),
		})
		.safeParse(req.body)
	if (!parsed.success)
		return res.status(400).json({ error: 'بيانات المقال غير صالحة' })
	return res.status(201).json(await createPost(req.userId!, parsed.data))
})
blogRoutes.get('/seo/sitemap.xml', async (_req, res) => {
	const base = process.env.FRONTEND_URL ?? 'https://borsatyai.com'
	const urls = await sitemapUrls()
	res
		.type('application/xml')
		.send(
			`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${base}${url}</loc></url>`).join('')}</urlset>`,
		)
})
