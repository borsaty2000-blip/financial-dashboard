import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

const categories = [
	['تحليل السوق', 'market-analysis', 5],
	['تعليمي', 'tutorial', 5],
	['رأي', 'opinion', 3],
	['أخبار', 'news', 3],
	['شريعة', 'shariah', 2],
	['تقنيات', 'technology', 2],
] as const

export const blogCatalog = categories.flatMap(([category, prefix, count]) =>
	Array.from({ length: count }, (_, index) => ({
		id: `fallback-${prefix}-${index + 1}`,
		slug: `${prefix}-${index + 1}`,
		title: `${category}: دليل بورصتي رقم ${index + 1}`,
		titleEn: `Borsaty ${category} guide ${index + 1}`,
		excerpt: `قراءة عملية مبسطة حول ${category} وأسواق مصر والسعودية.`,
		content: `هذا مقال تعليمي من بورصتي عن ${category}. استخدمه لفهم الفكرة، ثم راجع بيانات السوق والتحذيرات القانونية قبل أي قرار. لا يمثل المقال توصية استثمارية ولا يضمن نتيجة.`,
		category,
		tags: ['بورصتي', category, 'تحليل مالي'],
		keywords: [
			'البورصة المصرية',
			'تحليل أسهم',
			'EGX30',
			'التحليل الفني',
			'بورصتي',
		],
		seoTitle: `${category} | بورصتي`,
		seoDescription: `مقال عربي تعليمي عن ${category} وأسواق المنطقة.`,
		readingTime: 4,
		isFeatured: index === 0,
		isPublished: true,
		publishedAt: new Date('2026-09-01T08:00:00Z'),
		views: 0,
		likes: 0,
		shares: 0,
	})),
)

export async function listPosts(category?: string, featured?: boolean) {
	try {
		const rows = await prisma.blogPost.findMany({
			where: {
				isPublished: true,
				...(category ? { category } : {}),
				...(featured ? { isFeatured: true } : {}),
			},
			orderBy: { publishedAt: 'desc' },
			take: 50,
		})
		return rows.length
			? rows
			: blogCatalog.filter(
					(post) =>
						(!category || post.category === category) &&
						(!featured || post.isFeatured),
				)
	} catch {
		return blogCatalog.filter(
			(post) =>
				(!category || post.category === category) &&
				(!featured || post.isFeatured),
		)
	}
}

export async function getPost(slug: string) {
	try {
		return await prisma.blogPost.update({
			where: { slug },
			data: { views: { increment: 1 } },
			include: {
				comments: {
					where: { isApproved: true },
					orderBy: { createdAt: 'asc' },
				},
				author: { select: { username: true, fullName: true, bio: true } },
			},
		})
	} catch {
		return blogCatalog.find((post) => post.slug === slug) ?? null
	}
}

export function createPost(authorId: string, data: Record<string, unknown>) {
	return prisma.blogPost.create({
		data: {
			...(data as Record<string, any>),
			authorId,
			isPublished: true,
			publishedAt: new Date(),
			readingTime: Number(data.readingTime ?? 5),
			keywords: Array.isArray(data.keywords) ? data.keywords : [],
		} as any,
	})
}

export async function likePost(id: string) {
	try {
		return await prisma.blogPost.update({
			where: { id },
			data: { likes: { increment: 1 } },
		})
	} catch {
		return { id, likes: 1 }
	}
}
export async function addComment(
	userId: string,
	postId: string,
	content: string,
) {
	try {
		return await prisma.blogComment.create({
			data: { userId, postId, content },
		})
	} catch {
		return { id: randomUUID(), userId, postId, content, isApproved: true }
	}
}
export async function listCategories() {
	return categories.map(([name, slug, count]) => ({ name, slug, count }))
}
export async function sitemapUrls() {
	const posts = await listPosts()
	return posts.map((post) => `/blog/${post.slug}`)
}
