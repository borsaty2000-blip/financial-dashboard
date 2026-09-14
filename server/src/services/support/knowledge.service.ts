import { prisma } from '../../lib/prisma.js'
import { knowledgeCatalog } from './knowledge.catalog.js'

export async function listArticles(category?: string, query?: string) {
	try {
		const rows = await prisma.knowledgeArticle.findMany({
			where: {
				isPublished: true,
				...(category ? { category } : {}),
				...(query
					? {
							OR: [
								{ title: { contains: query, mode: 'insensitive' } },
								{ content: { contains: query, mode: 'insensitive' } },
							],
						}
					: {}),
			},
			orderBy: { category: 'asc' },
		})
		return rows.length ? rows : knowledgeCatalog
	} catch {
		const q = query?.toLowerCase()
		return knowledgeCatalog.filter(
			(article) =>
				(!category || article.category === category) &&
				(!q || `${article.title} ${article.content}`.toLowerCase().includes(q)),
		)
	}
}

export async function getArticle(slug: string) {
	try {
		return await prisma.knowledgeArticle.update({
			where: { slug },
			data: { views: { increment: 1 } },
		})
	} catch {
		return knowledgeCatalog.find((article) => article.slug === slug) ?? null
	}
}

export async function rateArticle(slug: string, helpful: boolean) {
	try {
		return await prisma.knowledgeArticle.update({
			where: { slug },
			data: helpful
				? { helpful: { increment: 1 } }
				: { notHelpful: { increment: 1 } },
		})
	} catch {
		return { slug, helpful }
	}
}
