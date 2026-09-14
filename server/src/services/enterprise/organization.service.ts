import { prisma } from '../../lib/prisma.js'

export async function applyOrganization(
	userId: string,
	data: {
		name: string
		nameEn?: string
		type: string
		contactEmail: string
		contactPhone?: string
		website?: string
	},
) {
	return prisma.organization.create({
		data: { ...data, members: { create: { userId, role: 'OWNER' } } },
		include: { members: true },
	})
}
export function getOrganization(id: string) {
	return prisma.organization.findUnique({
		where: { id },
		include: {
			members: {
				include: {
					user: { select: { username: true, fullName: true, email: true } },
				},
			},
		},
	})
}
export async function addMember(
	organizationId: string,
	userId: string,
	memberUserId: string,
	role = 'MEMBER',
) {
	const owner = await prisma.organizationMember.findFirst({
		where: { organizationId, userId, role: { in: ['OWNER', 'ADMIN'] } },
	})
	if (!owner) throw new Error('FORBIDDEN')
	return prisma.organizationMember.create({
		data: { organizationId, userId: memberUserId, role },
	})
}
export async function removeMember(
	organizationId: string,
	userId: string,
	memberUserId: string,
) {
	const owner = await prisma.organizationMember.findFirst({
		where: { organizationId, userId, role: { in: ['OWNER', 'ADMIN'] } },
	})
	if (!owner) throw new Error('FORBIDDEN')
	return prisma.organizationMember.deleteMany({
		where: { organizationId, userId: memberUserId, role: { not: 'OWNER' } },
	})
}
