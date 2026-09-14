import { useState } from 'react'
import { api } from '../lib/api'

export function AnalystApplyPage() {
	const [displayName, setDisplayName] = useState('')
	const [bio, setBio] = useState('')
	const [message, setMessage] = useState('')
	async function submit() {
		try {
			await api('/api/developer/analysts/apply', {
				method: 'POST',
				body: JSON.stringify({ displayName, bio, specialties: [] }),
			})
			setMessage('تم إرسال الطلب للمراجعة')
		} catch (e) {
			setMessage(e instanceof Error ? e.message : 'تعذر إرسال الطلب')
		}
	}
	return (
		<main className="analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Analyst Program</p>
				<h1>طلب اعتماد محلل</h1>
			</header>
			<section className="analysis-card simulator-form">
				<label>
					الاسم
					<input
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
					/>
				</label>
				<label>
					نبذة
					<textarea value={bio} onChange={(e) => setBio(e.target.value)} />
				</label>
				<button className="primary-button" onClick={submit}>
					إرسال الطلب
				</button>
				{message && <p>{message}</p>}
			</section>
		</main>
	)
}
