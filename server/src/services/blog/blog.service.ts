import { prisma } from '../../lib/prisma.js'
export async function listPosts(category?: string) {
	try {
		return await prisma.blogPost.findMany({
			where: { isPublished: true, ...(category ? { category } : {}) },
			orderBy: { publishedAt: 'desc' },
			take: 50,
		})
	} catch {
		return []
	}
}
export function getPost(slug: string) {
	return prisma.blogPost.update({
		where: { slug },
		data: { views: { increment: 1 } },
	})
}
export function createPost(authorId: string, data: Record<string, unknown>) {
	return prisma.blogPost.create({
		data: {
			...(data as Record<string, any>),
			authorId,
			isPublished: true,
			publishedAt: new Date(),
		} as any,
	})
}
export async function sitemapUrls() {
	const [posts, courses] = await Promise.all([
		prisma.blogPost.findMany({
			where: { isPublished: true },
			select: { slug: true },
		}),
		prisma.course.findMany({
			where: { isPublished: true },
			select: { id: true },
		}),
	])
	return [
		...posts.map((post) => `/blog/${post.slug}`),
		...courses.map((course) => `/education/${course.id}`),
	]
}
