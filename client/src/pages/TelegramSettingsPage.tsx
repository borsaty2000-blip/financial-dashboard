import { useEffect, useState } from 'react'
import { api } from '../lib/api'
export function TelegramSettingsPage() {
	const [info, setInfo] = useState<any>(null)
	const [chatId, setChatId] = useState('')
	const [message, setMessage] = useState('')
	useEffect(() => {
		void api('/api/telegram/info')
			.then(setInfo)
			.catch(() => undefined)
	}, [])
	async function link() {
		try {
			await api('/api/telegram/link', {
				method: 'POST',
				body: JSON.stringify({ chatId }),
			})
			setMessage('تم ربط Telegram')
		} catch {
			setMessage('أدخل chatId بعد إرسال /start للبوت')
		}
	}
	return (
		<main className="analysis-page telegram-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Telegram Alerts</p>
				<h1>ربط Telegram</h1>
				<p>افتح البوت وأرسل /start ثم أدخل chatId لربط التنبيهات.</p>
			</header>
			<section className="analysis-card telegram-card">
				<a
					className="primary-button"
					href={info?.botUrl ?? '#'}
					target="_blank"
					rel="noreferrer"
				>
					افتح في Telegram
				</a>
				<div className="telegram-qr">
					QR
					<br />
					<small>ضع رابط البوت هنا عند توفير اسم المستخدم</small>
				</div>
				<input
					placeholder="Telegram chatId"
					value={chatId}
					onChange={(e) => setChatId(e.target.value)}
				/>
				<button className="secondary-button" onClick={() => void link()}>
					ربط الحساب
				</button>
				{message && <p>{message}</p>}
			</section>
		</main>
	)
}
