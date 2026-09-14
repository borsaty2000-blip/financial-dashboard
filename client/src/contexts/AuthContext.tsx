import { useEffect, useState, type ReactNode } from 'react'
import { api, session } from '../lib/api'
import { AuthContext, type User } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const refresh = async () => {
		if (!session.token()) {
			setLoading(false)
			return
		}
		try {
			const result = await api<{ user: User }>('/api/auth/me', {
				suppressToast: true,
			})
			setUser(result.user)
		} catch {
			session.clear()
			setUser(null)
		} finally {
			setLoading(false)
		}
	}
	useEffect(() => {
		// Intentional async session hydration during provider startup.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void refresh()
	}, [])
	const login = async (identifier: string, password: string) => {
		const result = await api<{ accessToken: string; user: User }>(
			'/api/auth/login',
			{
				method: 'POST',
				body: JSON.stringify({ identifier, password }),
			},
		)
		session.set(result.accessToken)
		setUser(result.user)
	}
	const register = async (data: Record<string, unknown>) => {
		const result = await api<{ accessToken: string; user: User }>(
			'/api/auth/register',
			{ method: 'POST', body: JSON.stringify(data) },
		)
		session.set(result.accessToken)
		setUser(result.user)
	}
	const logout = async () => {
		try {
			await api('/api/auth/logout', { method: 'POST' })
		} finally {
			session.clear()
			setUser(null)
		}
	}
	return (
		<AuthContext.Provider
			value={{ user, loading, login, register, logout, refresh }}
		>
			{children}
		</AuthContext.Provider>
	)
}
