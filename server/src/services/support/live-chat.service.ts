import type { Namespace, Server } from 'socket.io'

export function attachLiveChatSocket(socketServer: Server): Namespace {
	const namespace = socketServer.of('/support')
	namespace.on('connection', (socket) => {
		socket.emit('chat:ready', {
			mode: 'chatbot',
			humanHours: '09:00-17:00 Africa/Cairo',
		})
		socket.on('chat:message', (payload: { message?: string }) => {
			const message = String(payload?.message ?? '').trim()
			if (!message) return
			socket.emit('chat:reply', {
				mode: 'chatbot',
				reply:
					'وصلت رسالتك. يمكنك فتح تذكرة من مركز الدعم إذا احتجت متابعة بشرية.',
				createdAt: new Date().toISOString(),
			})
		})
	})
	return namespace
}
