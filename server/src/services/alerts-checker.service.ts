import { prisma } from '../lib/prisma.js'
import { CandlesService } from './market/candles.service.js'
import { publishUserNotification } from './tradingview/signal-bus.js'

let timer: NodeJS.Timeout | undefined

async function checkAlerts() {
	const alerts = await prisma.priceAlert.findMany({ where: { isActive: true } })
	for (const alert of alerts) {
		try {
			const candles = await CandlesService.getCandles(
				alert.symbol,
				alert.market === 'TASI' ? 'TASI' : 'EGX',
				'1d',
				2,
			)
			const latest = candles.candles.at(-1)?.close
			const previous = candles.candles.at(-2)?.close
			if (!latest) continue
			const changePercent = previous
				? ((latest - previous) / previous) * 100
				: 0
			const triggered =
				alert.condition === 'ABOVE'
					? latest >= alert.targetValue
					: alert.condition === 'BELOW'
						? latest <= alert.targetValue
						: alert.condition === 'PERCENT_UP'
							? changePercent >= alert.targetValue
							: alert.condition === 'PERCENT_DOWN'
								? changePercent <= -Math.abs(alert.targetValue)
								: false
			if (!triggered) continue
			const notification = await prisma.$transaction(async (tx) => {
				const updated = await tx.priceAlert.updateMany({
					where: { id: alert.id, isActive: true },
					data: { isActive: false, triggeredAt: new Date() },
				})
				if (!updated.count) return null
				return tx.notification.create({
					data: {
						userId: alert.userId,
						type: 'ALERT',
						title: `تنبيه ${alert.symbol}`,
						body: `وصل السعر إلى ${latest}`,
						link: `/stock/${alert.symbol}`,
					},
				})
			})
			if (notification) publishUserNotification(alert.userId, notification)
		} catch (error) {
			console.warn(
				'Alert check failed:',
				error instanceof Error ? error.message : error,
			)
		}
	}
}

export function startAlertChecker() {
	if (timer) return timer
	timer = setInterval(() => {
		void checkAlerts().catch((error) =>
			console.warn(
				'Alert checker unavailable:',
				error instanceof Error ? error.message : error,
			),
		)
	}, 60_000)
	void checkAlerts().catch((error) =>
		console.warn(
			'Alert checker unavailable:',
			error instanceof Error ? error.message : error,
		),
	)
	return timer
}
