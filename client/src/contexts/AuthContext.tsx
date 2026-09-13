import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react'
import { api, session } from '../lib/api'

type User = {
	id: string
	email: string
	username: string
	fullName?: string | null
	avatarUrl?: string | null
	bio?: string | null
	country?: string | null
	isVerified?: boolean
}
type AuthValue = {
	user: User | null
	loading: boolean
	login: (identifier: string, password: string) => Promise<void>
	register: (data: Record<string, unknown>) => Promise<void>
	logout: () => Promise<void>
	refresh: () => Promise<void>
}
const AuthContext = createContext<AuthValue | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const refresh = async () => {
		if (!session.token()) {
			setLoading(false)
			return
		}
		try {
			const result = await api<{ user: User }>('/api/auth/me')
			setUser(result.user)
		} catch {
			session.clear()
			setUser(null)
		} finally {
			setLoading(false)
		}
	}
	useEffect(() => {
		void refresh()
	}, [])
	const login = async (identifier: string, password: string) => {
		const result = await api<{ accessToken: string; user: User }>(
			'/api/auth/login',
			{ method: 'POST', body: JSON.stringify({ identifier, password }) },
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
export function useAuth() {
	const value = useContext(AuthContext)
	if (!value) throw new Error('AuthProvider missing')
	return value
}
