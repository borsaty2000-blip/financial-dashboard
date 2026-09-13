import { unlink } from 'node:fs/promises'
import { prisma } from '../../lib/prisma.js'
import type {
	UpdateInterestsInput,
	UpdateProfileInput,
} from '../../validators/profile.validator.js'

const profileSelect = {
	id: true,
	email: true,
	username: true,
	fullName: true,
	avatarUrl: true,
	bio: true,
	country: true,
	language: true,
	isVerified: true,
	isActive: true,
	createdAt: true,
	preference: true,
	achievements: { include: { achievement: true } },
} as const
export async function getMyProfile(userId: string) {
	return prisma.user.findUnique({
		where: { id: userId },
		select: profileSelect,
	})
}
export async function updateProfile(userId: string, data: UpdateProfileInput) {
	return prisma.user.update({
		where: { id: userId },
		data,
		select: profileSelect,
	})
}
export async function uploadAvatar(userId: string, file: Express.Multer.File) {
	const current = await prisma.user.findUnique({
		where: { id: userId },
		select: { avatarUrl: true },
	})
	const avatarUrl = `/uploads/avatars/${file.filename}`
	const updated = await prisma.user.update({
		where: { id: userId },
		data: { avatarUrl },
		select: profileSelect,
	})
	if (current?.avatarUrl?.startsWith('/uploads/avatars/')) {
		const oldPath = `${process.cwd()}/server${current.avatarUrl}`
		await unlink(oldPath).catch(() => undefined)
	}
	return updated
}
export async function deleteAccount(userId: string) {
	await prisma.$transaction([
		prisma.user.update({ where: { id: userId }, data: { isActive: false } }),
		prisma.session.updateMany({
			where: { userId, revokedAt: null },
			data: { revokedAt: new Date() },
		}),
	])
	return { success: true }
}
export async function getPublicProfile(username: string, viewerId?: string) {
	const user = await prisma.user.findUnique({
		where: { username, isActive: true },
		select: {
			id: true,
			username: true,
			fullName: true,
			avatarUrl: true,
			bio: true,
			country: true,
			createdAt: true,
			achievements: {
				where: { completed: true },
				select: {
					completedAt: true,
					achievement: {
						select: {
							code: true,
							nameAr: true,
							nameEn: true,
							icon: true,
							points: true,
						},
					},
				},
			},
		},
	})
	if (!user) return null
	const isFollowing = viewerId
		? Boolean(
				await prisma.follow.findUnique({
					where: {
						followerId_followingId: {
							followerId: viewerId,
							followingId: user.id,
						},
					},
					select: { id: true },
				}),
			)
		: false
	return { ...user, isSelf: viewerId === user.id, isFollowing }
}
export async function updateInterests(
	userId: string,
	interests: UpdateInterestsInput,
) {
	return prisma.userPreference.upsert({
		where: { userId },
		create: { userId, ...interests },
		update: interests,
	})
}
