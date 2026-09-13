import nodemailer from 'nodemailer'

const smtpConfigured = Boolean(
	process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
)
const resendConfigured = Boolean(process.env.RESEND_API_KEY)
const transporter = smtpConfigured
	? nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: Number(process.env.SMTP_PORT ?? 587),
			secure: Number(process.env.SMTP_PORT ?? 587) === 465,
			auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
		})
	: null

function emailHtml(resetLink: string) {
	return `<!doctype html><html lang="ar" dir="rtl"><body style="font-family:Arial;background:#f6f8fb;padding:32px"><main style="max-width:560px;margin:auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e5e7eb"><h1 style="color:#0071bc">بورصتي</h1><h2>استعادة كلمة المرور</h2><p>تلقينا طلباً لاستعادة كلمة مرور حسابك. اضغط الزر التالي لإكمال العملية خلال 15 دقيقة.</p><p><a href="${resetLink}" style="display:inline-block;background:#0071bc;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">استعادة كلمة المرور</a></p><p style="color:#667085;font-size:13px">إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان.</p></main></body></html>`
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
	const html = emailHtml(resetLink)
	const from = process.env.EMAIL_FROM ?? 'بورصتي <onboarding@resend.dev>'
	if (resendConfigured) {
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from,
				to: [to],
				subject: 'استعادة كلمة مرور بورصتي',
				html,
			}),
		})
		if (!response.ok) throw new Error('تعذر إرسال رسالة الاستعادة')
		return { delivered: true, configured: true, provider: 'resend' as const }
	}
	if (transporter) {
		await transporter.sendMail({
			from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
			to,
			subject: 'استعادة كلمة مرور بورصتي',
			text: `يمكنك استعادة كلمة المرور من الرابط التالي: ${resetLink}`,
			html,
		})
		return { delivered: true, configured: true, provider: 'smtp' as const }
	}
	if (process.env.NODE_ENV !== 'production')
		console.info(`[password-reset] ${resetLink}`)
	return { delivered: false, configured: false }
}

export function isEmailConfigured() {
	return smtpConfigured || resendConfigured
}
