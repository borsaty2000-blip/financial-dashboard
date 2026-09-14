const API_URL = import.meta.env.VITE_API_URL ?? ''
const DEFAULT_TIMEOUT_MS = 15_000

type ApiOptions = RequestInit & { suppressToast?: boolean }

export const api = async <T>(
	path: string,	options: ApiOptions = {},
): Promise<T> => {
	const { suppressToast = false, ...requestOptions } = options
	const token = localStorage.getItem('borsaty_access_token')
	const headers = new Headers(requestOptions.headers)
	if (
		requestOptions.body &&
		!(requestOptions.body instanceof FormData) &&
		!headers.has('content-type')
	)
		headers.set('content-type', 'application/json')
	if (token) headers.set('authorization', `Bearer ${token}`)

	const controller = new AbortController()
	const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
	const callerSignal = requestOptions.signal
	if (callerSignal) {
		if (callerSignal.aborted) controller.abort()
		else
			callerSignal.addEventListener('abort', () => controller.abort(), {
				once: true,
			})
	}

	try {
		const response = await fetch(`${API_URL}${path}`, {
			...requestOptions,
			headers,
			signal: controller.signal,
		})
		const data = await response.json().catch(() => ({}))
		if (!response.ok) {
			const message = data.error ?? 'حدث خطأ في الاتصال'
			if (!suppressToast && typeof window !== 'undefined')
				window.dispatchEvent(
					new CustomEvent('borsaty-toast', {
						detail: { message, type: 'error' },
					}),
				)
			throw new Error(message)
		}
		return data as T
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			const message = 'انتهت مهلة الاتصال، حاول مرة أخرى'
			if (!suppressToast && typeof window !== 'undefined')
				window.dispatchEvent(
					new CustomEvent('borsaty-toast', {
						detail: { message, type: 'error' },
					}),
				)
			throw new Error(message, { cause: error })
		}
		throw error
	} finally {
		window.clearTimeout(timeout)
	}
}

export const session = {
	set: (token: string) => localStorage.setItem('borsaty_access_token', token),
	clear: () => localStorage.removeItem('borsaty_access_token'),
	token: () => localStorage.getItem('borsaty_access_token'),
}
