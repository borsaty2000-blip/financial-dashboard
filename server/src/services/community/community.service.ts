import { prisma } from '../../lib/prisma.js'

const fallbackCategories = [
	{ id: 'general', name: 'نقاش عام', nameEn: 'General', icon: '💬', order: 1 },
	{ id: 'egx', name: 'البورصة المصرية', nameEn: 'EGX', icon: '🇪🇬', order: 2 },
	{ id: 'tasi', name: 'السوق السعودي', nameEn: 'TASI', icon: '🇸🇦', order: 3 },
	{
		id: 'education',
		name: 'التعلم والتحليل',
		nameEn: 'Learning',
		icon: '📚',
		order: 4,
	},
]

export async function categories() {
	try {
		return await prisma.forumCategory.findMany({ orderBy: { order: 'asc' } })
	} catch {
		return fallbackCategories
	}
}
export async function topics(categoryId?: string) {
	try {
		return await prisma.forumTopic.findMany({
			where: categoryId ? { categoryId } : {},
			include: {
				user: { select: { username: true, fullName: true, avatarUrl: true } },
				category: true,
			},
			orderBy: [{ isPinned: 'desc' }, { lastReplyAt: 'desc' }],
			take: 50,
		})
	} catch {
		return []
	}
}
export async function topic(id: string) {
	return prisma.forumTopic.update({
		where: { id },
		data: { views: { increment: 1 } },
		include: {
			user: true,
			category: true,
			replies: { include: { user: true }, orderBy: { createdAt: 'asc' } },
		},
	})
}
export async function createTopic(
	userId: string,
	data: { categoryId: string; title: string; content: string; tags: string[] },
) {
	return prisma.forumTopic.create({ data: { ...data, userId } })
}
export async function createReply(
	userId: string,
	topicId: string,
	content: string,
) {
	return prisma.$transaction(async (tx) => {
		const reply = await tx.forumReply.create({
			data: { userId, topicId, content },
		})
		await tx.forumTopic.update({
			where: { id: topicId },
			data: { replyCount: { increment: 1 }, lastReplyAt: new Date() },
		})
		await tx.userReputation.upsert({
			where: { userId },
			update: { points: { increment: 2 }, helpfulAnswers: { increment: 1 } },
			create: { userId, points: 2, helpfulAnswers: 1 },
		})
		return reply
	})
}
export async function leaderboard() {
	try {
		return await prisma.userReputation.findMany({
			include: {
				user: { select: { username: true, fullName: true, avatarUrl: true } },
			},
			orderBy: { points: 'desc' },
			take: 20,
		})
	} catch {
		return []
	}
}

export async function updateTopic(
	userId: string,
	id: string,
	data: { title?: string; content?: string; tags?: string[] },
) {
	const item = await prisma.forumTopic.findUnique({ where: { id } })
	if (!item || item.userId !== userId) throw new Error('FORBIDDEN')
	return prisma.forumTopic.update({ where: { id }, data })
}
export async function deleteTopic(userId: string, id: string) {
	const item = await prisma.forumTopic.findUnique({ where: { id } })
	if (!item || item.userId !== userId) throw new Error('FORBIDDEN')
	return prisma.forumTopic.delete({ where: { id } })
}
export async function updateReply(userId: string, id: string, content: string) {
	const item = await prisma.forumReply.findUnique({ where: { id } })
	if (!item || item.userId !== userId) throw new Error('FORBIDDEN')
	return prisma.forumReply.update({ where: { id }, data: { content } })
}
export function likeReply(id: string) {
	return prisma.forumReply.update({
		where: { id },
		data: { likes: { increment: 1 } },
	})
}
export async function acceptReply(userId: string, id: string) {
	const reply = await prisma.forumReply.findUnique({
		where: { id },
		include: { topic: true },
	})
	if (!reply || reply.topic.userId !== userId) throw new Error('FORBIDDEN')
	return prisma.$transaction([
		prisma.forumReply.updateMany({
			where: { topicId: reply.topicId },
			data: { isAnswer: false },
		}),
		prisma.forumReply.update({ where: { id }, data: { isAnswer: true } }),
		prisma.userReputation.upsert({
			where: { userId: reply.userId },
			update: { points: { increment: 10 }, acceptedAnswers: { increment: 1 } },
			create: { userId: reply.userId, points: 10, acceptedAnswers: 1 },
		}),
	])
}
