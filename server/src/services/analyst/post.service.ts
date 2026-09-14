import { prisma } from '../../lib/prisma.js'
export async function listAnalystPosts(analystId: string) {
	return prisma.analystPost.findMany({
		where: { analystId },
		orderBy: { createdAt: 'desc' },
	})
}
export async function createAnalystPost(
	analystId: string,
	data: {
		symbol?: string
		type: string
		title: string
		content: string
		charts?: string[]
		sentiment?: string
		isPremium?: boolean
	},
) {
	return prisma.analystPost.create({ data: { analystId, ...data } })
}
export async function deleteAnalystPost(analystId: string, id: string) {
	return prisma.analystPost.deleteMany({ where: { id, analystId } })
}
