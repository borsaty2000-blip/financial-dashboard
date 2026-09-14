import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatEnglishDate } from '../lib/format'
export function SecuritySettingsPage() {
	const [enabled, setEnabled] = useState(false)
	const [setup, setSetup] = useState<{ secret: string; qrCode: string } | null>(
		null,
	)
	const [code, setCode] = useState('')
	const [sessions, setSessions] = useState<any[]>([])
	const [history, setHistory] = useState<any[]>([])
	const [message, setMessage] = useState('')
	const load = async () => {
		const [status, active, logins] = await Promise.all([
			api<any>('/api/security/status'),
			api<any[]>('/api/security/sessions'),
			api<any[]>('/api/security/login-history'),
		])
		setEnabled(status.twoFactorEnabled)
		setSessions(active)
		setHistory(logins)
	}
	useEffect(() => {
		void load().catch(() => undefined)
	}, [])
	const begin = async () => setSetup(await api('/api/security/2fa/setup'))
	const confirm = async () => {
		if (!setup) return
		await api('/api/security/2fa/confirm', {
			method: 'POST',
			body: JSON.stringify({ secret: setup.secret, code }),
		})
		setEnabled(true)
		setSetup(null)
		setCode('')
		setMessage('تم تفعيل المصادقة الثنائية')
	}
	const disable = async () => {
		await api('/api/security/2fa/disable', {
			method: 'POST',
			body: JSON.stringify({ code }),
		})
		setEnabled(false)
		setCode('')
		setMessage('تم تعطيل المصادقة الثنائية')
	}
	const revokeAll = async () => {
		await api('/api/security/sessions', { method: 'DELETE' })
		await load()
	}
	return (
		<main className="page-container security-page">
			<section className="panel">
				<h1>الأمان والخصوصية</h1>
				<p className="muted">تحكم في المصادقة الثنائية والجلسات وسجل الدخول.</p>
				{message && <div className="success-box">{message}</div>}
				<div className="security-row">
					<div>
						<strong>المصادقة الثنائية TOTP</strong>
						<p className="muted">
							استخدم Google Authenticator أو تطبيقاً متوافقاً.
						</p>
					</div>
					{enabled ? (
						<button className="secondary-button" onClick={() => void disable()}>
							تعطيل 2FA
						</button>
					) : (
						<button className="primary-button" onClick={() => void begin()}>
							إعداد 2FA
						</button>
					)}
				</div>
				{setup && (
					<div className="two-factor-setup">
						<img src={setup.qrCode} alt="QR code" />
						<p>
							المفتاح اليدوي: <code>{setup.secret}</code>
						</p>
						<input
							inputMode="numeric"
							maxLength={6}
							value={code}
							onChange={(event) => setCode(event.target.value)}
							placeholder="رمز من 6 أرقام"
						/>
						<button className="primary-button" onClick={() => void confirm()}>
							تأكيد التفعيل
						</button>
					</div>
				)}{' '}
				{(enabled || setup) && !setup && (
					<input
						className="security-code"
						inputMode="numeric"
						maxLength={6}
						value={code}
						onChange={(event) => setCode(event.target.value)}
						placeholder="رمز 2FA"
					/>
				)}
				<hr />
				<div className="security-row">
					<strong>الجلسات النشطة ({sessions.length})</strong>
					<button className="secondary-button" onClick={() => void revokeAll()}>
						إنهاء جميع الجلسات
					</button>
				</div>
				{sessions.map((session) => (
					<div className="session-item" key={session.id}>
						<span>{session.userAgent || 'جهاز غير معروف'}</span>
						<small>
							{session.ipAddress || '—'} ·{' '}
							{formatEnglishDate(session.createdAt)}
						</small>
					</div>
				))}
				<h2>سجل تسجيل الدخول</h2>
				{history.map((entry) => (
					<div className="session-item" key={entry.id}>
						<span>{entry.success ? 'دخول ناجح' : 'دخول فاشل'}</span>
						<small>
							{entry.ipAddress || '—'} · {formatEnglishDate(entry.createdAt)}
						</small>
					</div>
				))}
			</section>
		</main>
	)
}
