import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import {
	addComment,
	createPost,
	getPost,
	likePost,
	listCategories,
	listPosts,
	sitemapUrls,
} from '../services/blog/blog.service.js'

export const blogRoutes = Router()
const postSchema = z.object({
	slug: z.string().regex(/^[a-z0-9-]+$/),
	title: z.string().min(3),
	titleEn: z.string().optional(),
	excerpt: z.string().max(500).optional(),
	content: z.string().min(30),
	coverImage: z.string().url().optional(),
	category: z.string(),
	tags: z.array(z.string()).default([]),
	keywords: z.array(z.string()).default([]),
	seoTitle: z.string().max(70).optional(),
	seoDescription: z.string().max(170).optional(),
	readingTime: z.number().int().positive().optional(),
})

blogRoutes.get('/blog/posts', async (req, res) =>
	res.json(
		await listPosts(
			typeof req.query.category === 'string' ? req.query.category : undefined,
		),
	),
)
blogRoutes.get('/blog/featured', async (_req, res) =>
	res.json(await listPosts(undefined, true)),
)
blogRoutes.get('/blog/categories', async (_req, res) =>
	res.json(await listCategories()),
)
blogRoutes.get('/blog/rss.xml', async (_req, res) => {
	const posts = await listPosts()
	res
		.type('application/rss+xml')
		.send(
			`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>بورصتي</title><link>https://borsatyai.com/blog</link>${posts.map((post) => `<item><title>${post.title}</title><link>https://borsatyai.com/blog/${post.slug}</link><description>${post.excerpt ?? ''}</description></item>`).join('')}</channel></rss>`,
		)
})
blogRoutes.get('/blog/category/:category', async (req, res) =>
	res.json(await listPosts(req.params.category)),
)
blogRoutes.get('/blog/posts/:slug', async (req, res) => {
	const post = await getPost(req.params.slug)
	return post
		? res.json(post)
		: res.status(404).json({ error: 'المقال غير موجود' })
})
blogRoutes.get('/blog/:slug', async (req, res) => {
	const post = await getPost(req.params.slug)
	return post
		? res.json(post)
		: res.status(404).json({ error: 'المقال غير موجود' })
})
blogRoutes.post('/blog/posts', requireAdmin, async (req, res) => {
	const parsed = postSchema.safeParse(req.body)
	if (!parsed.success)
		return res.status(400).json({ error: 'بيانات المقال غير صالحة' })
	return res.status(201).json(await createPost(req.userId!, parsed.data))
})
blogRoutes.post('/blog/posts/:id/like', async (req, res) =>
	res.json(await likePost(req.params.id)),
)
blogRoutes.post('/blog/posts/:id/comments', requireAuth, async (req, res) => {
	const content = z.string().min(2).max(5000).safeParse(req.body.content)
	if (!content.success)
		return res.status(400).json({ error: 'التعليق غير صالح' })
	return res
		.status(201)
		.json(await addComment(req.userId!, req.params.id, content.data))
})
blogRoutes.get('/seo/sitemap-blog.xml', async (_req, res) => {
	const site = process.env.FRONTEND_URL ?? 'https://borsatyai.com'
	const urls = await sitemapUrls()
	res
		.type('application/xml')
		.send(
			`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${site}${url}</loc></url>`).join('')}</urlset>`,
		)
})
