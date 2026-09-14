import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export default function NotificationLive() {
	const [message, setMessage] = useState('')
	useEffect(() => {
		const url = import.meta.env.VITE_API_URL || window.location.origin
		const socket: Socket = io(url, {
			path: '/socket.io',
			transports: ['websocket', 'polling'],
			autoConnect: true,
		})
		const onStream = (payload: { symbol?: string; message?: string }) =>
			setMessage(payload.message ?? `تحديث تحليلي ${payload.symbol ?? ''}`)
		socket.on('analysis:stream', onStream)
		return () => {
			socket.off('analysis:stream', onStream)
			socket.close()
		}
	}, [])
	if (!message) return null
	return (
		<div className="live-analysis-notice" role="status">
			{message}
		</div>
	)
}
