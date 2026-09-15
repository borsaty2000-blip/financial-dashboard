import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export function LiveChatWidget() {
	const [open, setOpen] = useState(false)
	const [input, setInput] = useState('')
	const [replies, setReplies] = useState<string[]>([])
	const [socket, setSocket] = useState<Socket | null>(null)
	useEffect(() => {
		if (!open) return
		const client = io(
			`${import.meta.env.VITE_API_URL ?? window.location.origin}/support`,
			{ path: '/socket.io', transports: ['websocket'] },
		)
		client.on('chat:reply', (payload: { reply: string }) =>
			setReplies((items) => [...items, payload.reply]),
		)
		setSocket(client)
		return () => {
			client.close()
			setSocket(null)
		}
	}, [open])
	return (
		<div className="live-chat-widget">
			<button
				className="chat-fab"
				aria-label="فتح الدعم"
				onClick={() => setOpen((value) => !value)}
			>
				مساعدة
			</button>
			{open && (
				<div className="chat-panel">
					<header>
						<b>دعم borsatyai</b>
						<button onClick={() => setOpen(false)}>×</button>
					</header>
					<div className="chat-messages">
						<p>مرحباً، أنا مساعد الدعم. كيف أساعدك؟</p>
						{replies.map((reply, index) => (
							<p key={index}>{reply}</p>
						))}
					</div>
					<form
						onSubmit={(event) => {
							event.preventDefault()
							if (input.trim()) {
								socket?.emit('chat:message', { message: input })
								setInput('')
							}
						}}
					>
						<input
							value={input}
							onChange={(event) => setInput(event.target.value)}
							placeholder="اكتب رسالتك"
						/>
						<button>إرسال</button>
					</form>
				</div>
			)}
		</div>
	)
}
