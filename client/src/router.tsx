import { useEffect, useState } from 'react'
export function navigate(to: string) {
	window.history.pushState({}, '', to)
	window.dispatchEvent(new PopStateEvent('popstate'))
}
export function useLocation() {
	const [location, setLocation] = useState(
		window.location.pathname + window.location.search,
	)
	useEffect(() => {
		const handler = () =>
			setLocation(window.location.pathname + window.location.search)
		window.addEventListener('popstate', handler)
		return () => window.removeEventListener('popstate', handler)
	}, [])
	return location
}
export function Navigate({ to }: { to: string }) {
	useEffect(() => navigate(to), [to])
	return null
}
