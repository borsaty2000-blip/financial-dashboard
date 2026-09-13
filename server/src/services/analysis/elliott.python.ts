const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '')

export async function analyzeElliott(prices: number[], order = 5) {
	const response = await fetch(`${pythonServiceUrl}/analyze/elliott`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ prices, order }),
	})
	const body = await response.json().catch(() => ({}))
	if (!response.ok)
		throw new Error(
			`Python Elliott service ${response.status}: ${JSON.stringify(body)}`,
		)
	return body
}
