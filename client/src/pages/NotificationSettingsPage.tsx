import { useState } from 'react'
import { usePushNotifications } from '../hooks/usePushNotifications'
export function NotificationSettingsPage() {
	const { supported, enabled, busy, enable } = usePushNotifications()
	const [message, setMessage] = useState('')
	return (
		<main className="page-container">
			<section className="panel notification-settings">
				<h1>إعدادات الإشعارات</h1>
				<p className="muted">
					استقبل تنبيهات الأسعار والتحليلات والتقارير الأسبوعية على جهازك.
				</p>
				{enabled ? (
					<div className="success-box">الإشعارات مفعلة على هذا الجهاز.</div>
				) : (
					<button
						className="primary-button"
						disabled={!supported || busy}
						onClick={() =>
							void enable().catch((error: Error) => setMessage(error.message))
						}
					>
						{busy ? 'جارٍ التفعيل...' : 'تفعيل الإشعارات'}
					</button>
				)}
				{!supported && (
					<p className="muted">
						هذا المتصفح لا يدعم Web Push أو يحتاج إلى HTTPS.
					</p>
				)}
				{message && <div className="error-box">{message}</div>}
			</section>
		</main>
	)
}
