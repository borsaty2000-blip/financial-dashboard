import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const limits: Record<string, { daily: number; monthly: number }> = {
	FREE: { daily: 100, monthly: 3000 },
	PRO: { daily: 10000, monthly: 100000 },
	ENTERPRISE: {
		daily: Number.MAX_SAFE_INTEGER,
		monthly: Number.MAX_SAFE_INTEGER,
	},
}
export async function generateKey(userId: string, name: string) {
	const raw = `bors_${randomBytes(24).toString('hex')}`
	const key = await prisma.apiKey.create({
		data: { userId, name, keyHash: hash(raw), keyPrefix: raw.slice(0, 12) },
	})
	return {
		id: key.id,
		name: key.name,
		key: raw,
		keyPrefix: key.keyPrefix,
		tier: key.tier,
		warning: 'احفظ المفتاح الآن؛ لن يظهر كاملاً مرة أخرى.',
	}
}
export async function validateKey(raw: string) {
	const key = await prisma.apiKey.findFirst({
		where: { keyHash: hash(raw), revokedAt: null, isActive: true },
	})
	if (!key || (key.expiresAt && key.expiresAt < new Date())) return null
	await prisma.apiKey.update({
		where: { id: key.id },
		data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
	})
	return key
}
export async function revokeKey(userId: string, keyId: string) {
	return prisma.apiKey.updateMany({
		where: { id: keyId, userId },
		data: { revokedAt: new Date(), isActive: false },
	})
}
export async function listKeys(userId: string) {
	return prisma.apiKey.findMany({
		where: { userId, revokedAt: null },
		select: {
			id: true,
			name: true,
			keyPrefix: true,
			tier: true,
			dailyLimit: true,
			monthlyLimit: true,
			requestCount: true,
			lastUsedAt: true,
			expiresAt: true,
			createdAt: true,
		},
	})
}
export async function getUsageStats(userId: string, period = '30d') {
	const days = period === '24h' ? 1 : period === '7d' ? 7 : 30
	const since = new Date(Date.now() - days * 86400000)
	const keys = await prisma.apiKey.findMany({
		where: { userId },
		select: {
			id: true,
			name: true,
			tier: true,
			dailyLimit: true,
			monthlyLimit: true,
			requestCount: true,
		},
	})
	const logs = await prisma.apiUsageLog.findMany({
		where: {
			apiKeyId: { in: keys.map((key) => key.id) },
			createdAt: { gte: since },
		},
		select: {
			endpoint: true,
			statusCode: true,
			latencyMs: true,
			createdAt: true,
			apiKeyId: true,
		},
	})
	return {
		period,
		keys,
		total: logs.length,
		errors: logs.filter((log) => log.statusCode >= 400).length,
		averageLatencyMs: logs.length
			? Math.round(
					logs.reduce((sum, log) => sum + log.latencyMs, 0) / logs.length,
				)
			: 0,
		logs,
	}
}
export function tierLimits(tier: string) {
	return limits[tier] ?? limits.FREE
}
export { hash }
