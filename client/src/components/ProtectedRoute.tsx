import { Navigate, useLocation } from '../router'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
export default function ProtectedRoute({ children }: { children: ReactNode }) {
	const { user, loading } = useAuth()
	const location = useLocation()
	if (loading)
		return (
			<div className="loading-screen">
				<div className="spinner" /> جاري تحميل حسابك...
			</div>
		)
	return user ? (
		<>{children}</>
	) : (
		<Navigate to={`/login?next=${encodeURIComponent(location)}`} />
	)
}
