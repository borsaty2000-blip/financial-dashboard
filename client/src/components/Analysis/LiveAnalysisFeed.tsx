import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

type Update = {
	symbol: string
	timestamp: string
	consensus?: { signal?: string; score?: number }
}

export function LiveAnalysisFeed({
	symbols = ['COMI', 'ABUK', 'ETEL'],
}: {
	symbols?: string[]
}) {
	const [updates, setUpdates] = useState<Update[]>([])
	useEffect(() => {
		const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
			transports: ['websocket', 'polling'],
		})
		const onUpdate = (update: Update) =>
			setUpdates((current) =>
				[
					update,
					...current.filter((item) => item.symbol !== update.symbol),
				].slice(0, 20),
			)
		socket.emit('live:subscribe', symbols)
		socket.on('analysis:update', onUpdate)
		return () => {
			socket.emit('live:unsubscribe', symbols)
			socket.off('analysis:update', onUpdate)
			socket.close()
		}
	}, [symbols])
	return (
		<section className="live-feed analysis-card" dir="rtl">
			<div className="panel-title">
				<h2>تحليل مباشر</h2>
				<span className="live-dot" aria-label="متصل" />
			</div>
			{updates.length ? (
				updates.map((update) => (
					<div className="feed-item" key={update.symbol}>
						<b>{update.symbol}</b>
						<span
							className={`signal ${(update.consensus?.signal ?? 'HOLD').toLowerCase()}`}
						>
							{update.consensus?.signal ?? 'HOLD'}
						</span>
						<strong>{update.consensus?.score ?? '—'}/100</strong>
						<small>
							{new Date(update.timestamp).toLocaleTimeString('ar-EG', {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</small>
					</div>
				))
			) : (
				<p className="muted">بانتظار أول تحديث تحليلي…</p>
			)}
		</section>
	)
}
