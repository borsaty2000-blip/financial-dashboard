import { createContext } from 'react'

export type User = {
	id: string
	email: string
	username: string
	fullName?: string | null
	avatarUrl?: string | null
	bio?: string | null
	country?: string | null
	isVerified?: boolean
}

export type AuthValue = {
	user: User | null
	loading: boolean
	login: (identifier: string, password: string) => Promise<void>
	register: (data: Record<string, unknown>) => Promise<void>
	logout: () => Promise<void>
	refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
