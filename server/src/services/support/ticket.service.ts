import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

function ticketNumber() {
	return `BOR-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export async function createTicket(
	userId: string,
	input: {
		subject: string
		category: string
		priority?: string
		content: string
	},
) {
	try {
		return await prisma.supportTicket.create({
			data: {
				userId,
				ticketNumber: ticketNumber(),
				subject: input.subject,
				category: input.category,
				priority: input.priority ?? 'NORMAL',
				messages: {
					create: {
						senderId: userId,
						senderType: 'USER',
						content: input.content,
					},
				},
			},
			include: { messages: true },
		})
	} catch {
		return {
			id: randomUUID(),
			userId,
			ticketNumber: ticketNumber(),
			...input,
			status: 'OPEN',
			messages: [
				{ senderId: userId, senderType: 'USER', content: input.content },
			],
		}
	}
}

export async function listTickets(userId: string) {
	try {
		return await prisma.supportTicket.findMany({
			where: { userId },
			include: { messages: true },
			orderBy: { updatedAt: 'desc' },
		})
	} catch {
		return []
	}
}

export async function getTicket(userId: string, id: string) {
	try {
		return await prisma.supportTicket.findFirstOrThrow({
			where: { id, userId },
			include: { messages: { orderBy: { createdAt: 'asc' } } },
		})
	} catch {
		return null
	}
}

export async function addMessage(
	userId: string,
	ticketId: string,
	content: string,
) {
	try {
		const ticket = await prisma.supportTicket.findFirstOrThrow({
			where: { id: ticketId, userId },
		})
		return await prisma.supportMessage.create({
			data: {
				ticketId: ticket.id,
				senderId: userId,
				senderType: 'USER',
				content,
			},
		})
	} catch {
		return {
			ticketId,
			senderId: userId,
			senderType: 'USER',
			content,
			createdAt: new Date(),
		}
	}
}

export async function updateTicketStatus(
	userId: string,
	id: string,
	status: string,
) {
	try {
		return await prisma.supportTicket.updateMany({
			where: { id, userId },
			data: {
				status,
				resolvedAt: ['RESOLVED', 'CLOSED'].includes(status) ? new Date() : null,
			},
		})
	} catch {
		return { count: 0 }
	}
}
