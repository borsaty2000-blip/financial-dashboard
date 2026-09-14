export async function createAnalystCheckout(input: {
	username: string
	amount: number
	currency?: string
}) {
	const provider = process.env.STRIPE_SECRET_KEY
		? 'stripe'
		: process.env.PAYPAL_CLIENT_ID
			? 'paypal'
			: null
	if (!provider)
		return {
			available: false,
			provider: null,
			message: 'أضف بيانات Stripe أو PayPal لتفعيل الدفع الحقيقي.',
		}
	return {
		available: false,
		provider,
		amount: input.amount,
		currency: input.currency ?? 'USD',
		message:
			'تم تجهيز موصل الدفع؛ يلزم إكمال checkout provider قبل تحصيل أي مبلغ.',
	}
}
