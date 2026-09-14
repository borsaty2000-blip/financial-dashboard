import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function DeveloperDashboardPage() {
	const [keys, setKeys] = useState<any[]>([])
	const [name, setName] = useState('My App')
	const [newKey, setNewKey] = useState('')
	async function load() {
		setKeys(await api('/api/developer/keys'))
	}
	useEffect(() => {
		void load().catch(() => undefined)
	}, [])
	async function create() {
		const data = await api<any>('/api/developer/keys', {
			method: 'POST',
			body: JSON.stringify({ name }),
		})
		setNewKey(data.key)
		void load()
	}
	return (
		<main className="analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Developer Platform</p>
				<h1>لوحة المطور</h1>
				<p>مفاتيح API للقراءة فقط ضمن الحدود المعلنة.</p>
			</header>
			<section className="analysis-card simulator-form">
				<input value={name} onChange={(e) => setName(e.target.value)} />
				<button className="primary-button" onClick={create}>
					إنشاء مفتاح
				</button>
				{newKey && <code>{newKey}</code>}
			</section>
			<section className="analysis-card">
				{keys.map((key) => (
					<div className="tool-row" key={key.id}>
						<b>{key.name}</b>
						<span>{key.keyPrefix}</span>
						<span>{key.requestCount} طلب</span>
						<button
							className="link-button"
							onClick={() =>
								api(`/api/developer/keys/${key.id}`, { method: 'DELETE' }).then(
									load,
								)
							}
						>
							إلغاء
						</button>
					</div>
				))}
			</section>
		</main>
	)
}
