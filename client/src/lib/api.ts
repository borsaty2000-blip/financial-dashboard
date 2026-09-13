const API_URL = import.meta.env.VITE_API_URL ?? ''

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('borsaty_access_token')
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData) && !headers.has('content-type')) headers.set('content-type', 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data.error ?? 'حدث خطأ في الاتصال'
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('borsaty-toast', { detail: { message, type: 'error' } }))
    throw new Error(message)
  }
  return data as T
}
export const session = { set: (token: string) => localStorage.setItem('borsaty_access_token', token), clear: () => localStorage.removeItem('borsaty_access_token'), token: () => localStorage.getItem('borsaty_access_token') }
