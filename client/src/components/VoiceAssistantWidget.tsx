import { useState } from 'react'
import { api } from '../lib/api'

type SpeechRecognitionLike = {
	lang: string
	start: () => void
	onresult: ((event: any) => void) | null
	onerror: (() => void) | null
}
export function VoiceAssistantWidget() {
	const [open, setOpen] = useState(false)
	const [text, setText] = useState('')
	const [answer, setAnswer] = useState('')
	const [audioUrl, setAudioUrl] = useState<string | null>(null)
	const [listening, setListening] = useState(false)
	function listen() {
		const Recognition =
			(window as any).SpeechRecognition ??
			(window as any).webkitSpeechRecognition
		if (!Recognition)
			return setAnswer('المتصفح لا يدعم التعرف الصوتي. اكتب الأمر يدوياً.')
		const recognition = new Recognition() as SpeechRecognitionLike
		recognition.lang = 'ar-EG'
		recognition.onresult = (event) => {
			const value = event.results[0][0].transcript
			setText(value)
			setListening(false)
			void ask(value)
		}
		recognition.onerror = () => setListening(false)
		setListening(true)
		recognition.start()
	}
	async function ask(value = text) {
		if (!value.trim()) return
		try {
			const result = await api<any>('/api/voice/query', {
				method: 'POST',
				body: JSON.stringify({ text: value }),
			})
			setAnswer(result.text ?? result.response ?? 'تمت معالجة الأمر')
			setAudioUrl(result.audioUrl ?? null)
			if (result.audioUrl)
				new Audio(result.audioUrl).play().catch(() => undefined)
		} catch {
			setAnswer('تعذر الاتصال بالمساعد حالياً')
		}
	}
	return (
		<>
			<button
				className="voice-fab"
				aria-label="المساعد الصوتي"
				onClick={() => setOpen(!open)}
			>
				🎤
			</button>
			{open && (
				<section className="voice-panel" dir="rtl">
					<header>
						<strong>مساعد بورصتي</strong>
						<button onClick={() => setOpen(false)}>×</button>
					</header>
					<p>اسأل عن سهم أو الأخبار أو أنشئ مسودة تنبيه.</p>
					<div className="voice-input">
						<input
							value={text}
							onChange={(event) => setText(event.target.value)}
							placeholder="ما رأيك في COMI؟"
							onKeyDown={(event) => {
								if (event.key === 'Enter') void ask()
							}}
						/>
						<button onClick={listen} disabled={listening}>
							{listening ? 'يستمع...' : '🎙️'}
						</button>
					</div>
					{answer && (
						<div className="voice-answer">
							{answer}
							{audioUrl && <audio controls src={audioUrl} />}
						</div>
					)}
				</section>
			)}
		</>
	)
}
