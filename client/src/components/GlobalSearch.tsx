import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { navigate } from '../router'
type Result = {
	symbol: string
	name: string
	price: number | null
	changePercent: number | null
}
export default function GlobalSearch() {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<Result[]>([])
	const [selected, setSelected] = useState(0)
	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				setOpen(true)
			}
			if (!open) return
			if (event.key === 'Escape') setOpen(false)
			if (event.key === 'ArrowDown')
				setSelected((value) => Math.min(value + 1, results.length - 1))
			if (event.key === 'ArrowUp')
				setSelected((value) => Math.max(value - 1, 0))
			if (event.key === 'Enter' && results[selected]) {
				navigate(`/stock/${results[selected].symbol}`)
				setOpen(false)
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [open, results, selected])
	useEffect(() => {
		const openSearch = () => setOpen(true)
		window.addEventListener('borsaty-open-search', openSearch)
		return () => window.removeEventListener('borsaty-open-search', openSearch)
	}, [])
	useEffect(() => {
		if (!query.trim()) return setResults([])
		const timer = window.setTimeout(() => {
			void api<Result[]>(`/api/search?q=${encodeURIComponent(query)}`)
				.then(setResults)
				.catch(() => setResults([]))
		}, 180)
		return () => window.clearTimeout(timer)
	}, [query])
	return open ? (
		<div className="search-overlay" onMouseDown={() => setOpen(false)}>
			<div
				className="search-modal"
				onMouseDown={(event) => event.stopPropagation()}
			>
				<input
					autoFocus
					value={query}
					onChange={(event) => {
						setQuery(event.target.value)
						setSelected(0)
					}}
					placeholder="ابحث عن رمز أو اسم سهم..."
				/>
				{results.map((item, index) => (
					<button
						className={
							index === selected ? 'search-result selected' : 'search-result'
						}
						key={item.symbol}
						onClick={() => {
							navigate(`/stock/${item.symbol}`)
							setOpen(false)
						}}
					>
						<b>{item.symbol}</b>
						<span>{item.name}</span>
						<small>{item.price == null ? '—' : item.price.toFixed(2)}</small>
					</button>
				))}
				{query && !results.length && <p className="muted">لا توجد نتائج.</p>}
				<small className="search-hint">
					↑ ↓ للتنقل · Enter للفتح · Esc للإغلاق
				</small>
			</div>
		</div>
	) : null
}
