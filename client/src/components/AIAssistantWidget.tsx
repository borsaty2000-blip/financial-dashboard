import { useState } from 'react'
import { api } from '../lib/api'

type AssistantResponse = {
	message: string
	symbol?: string
	available: boolean
	consensus?: { score: number; signal: string; confidence: number }
	stocks?: Array<{ symbol: string; score: number; signal: string }>
	elliott?: { data?: { confidence?: number; current_wave?: unknown } }
	gann?: { data?: { angles?: Record<string, { value?: number }> } }
	disclaimer: string
}

export default function AIAssistantWidget() {
	const [open, setOpen] = useState(false)
	const [input, setInput] = useState('')
	const [loading, setLoading] = useState(false)
	const [messages, setMessages] = useState<
		Array<{
			role: 'user' | 'assistant'
			content: string
			data?: AssistantResponse
		}>
	>([])

	const send = async (question = input) => {
		const value = question.trim()
		if (!value || loading) return
		setInput('')
		setMessages((items) => [...items, { role: 'user', content: value }])
		setLoading(true)
		try {
			const data = await api<AssistantResponse>('/api/ai/chat', {
				method: 'POST',
				body: JSON.stringify({
					message: value,
					history: messages
						.slice(-12)
						.map(({ role, content }) => ({ role, content })),
				}),
			})
			setMessages((items) => [
				...items,
				{ role: 'assistant', content: data.message, data },
			])
		} catch {
			setMessages((items) => [
				...items,
				{
					role: 'assistant',
					content: 'تعذر الوصول إلى المساعد حالياً. لم يتم إنشاء تحليل بديل.',
				},
			])
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="ai-assistant-widget" dir="rtl">
			<button
				className="ai-assistant-fab"
				aria-label="فتح مساعد borsatyai"
				onClick={() => setOpen((value) => !value)}
			>
				🤖 مساعد borsatyai
			</button>
			{open && (
				<section className="ai-assistant-panel" aria-label="مساعد borsatyai">
					<header>
						<div>
							<strong>مساعد borsatyai</strong>
							<small>شات ذكي عام · تحليل تعليمي بلا تنفيذ صفقات</small>
						</div>
						<button aria-label="إغلاق" onClick={() => setOpen(false)}>
							×
						</button>
					</header>
					<div className="ai-assistant-messages">
						{messages.length === 0 && (
							<div className="ai-assistant-welcome">
								<p>
									اسألني بحرية: شرح، أخبار، تقنية، استخدام المنصة، أو تحليل سهم.
								</p>
								<div>
									<button onClick={() => void send('اشرح لي RSI بطريقة بسيطة')}>
										اشرح مؤشراً
									</button>
									<button
										onClick={() => void send('كيف أستخدم منصة borsatyai؟')}
									>
										مساعدة في المنصة
									</button>
									<button
										onClick={() =>
											void send('ما الفرق بين الاستثمار والتداول؟')
										}
									>
										سؤال عام
									</button>
								</div>
							</div>
						)}
						{messages.map((item, index) => (
							<div
								className={`ai-message ${item.role}`}
								key={`${item.role}-${index}`}
							>
								<p>{item.content}</p>
								{item.data?.consensus && (
									<div className="ai-result-card">
										<b>الإجماع: {item.data.consensus.score}/100</b>
										<span>{item.data.consensus.signal}</span>
										<small>الثقة {item.data.consensus.confidence}%</small>
									</div>
								)}
								{item.data?.stocks?.length ? (
									<div className="ai-result-card">
										{item.data.stocks.map((stock) => (
											<div key={stock.symbol}>
												<b>{stock.symbol}</b> <span>{stock.score}/100</span>
											</div>
										))}
									</div>
								) : null}
							</div>
						))}
						{loading && (
							<div className="ai-message assistant">جاري تجهيز الإجابة...</div>
						)}
					</div>
					<form
						onSubmit={(event) => {
							event.preventDefault()
							void send()
						}}
					>
						<input
							value={input}
							onChange={(event) => setInput(event.target.value)}
							placeholder="اكتب سؤالك..."
							aria-label="سؤال المساعد"
						/>
						<button disabled={loading}>إرسال</button>
					</form>
				</section>
			)}
		</div>
	)
}
