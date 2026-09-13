import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react'

type Toast = {
	id: number
	type: 'success' | 'error' | 'warning' | 'info'
	message: string
}
const ToastContext = createContext<{
	show: (message: string, type?: Toast['type']) => void
}>({ show: () => undefined })
export function ToastProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<Toast[]>([])
	const show = (message: string, type: Toast['type'] = 'info') => {
		const id = Date.now() + Math.random()
		setItems((current) => [...current, { id, message, type }])
		window.setTimeout(
			() => setItems((current) => current.filter((item) => item.id !== id)),
			4500,
		)
	}
	useEffect(() => {
		const handler = (event: Event) => {
			const detail = (
				event as CustomEvent<{ message: string; type?: Toast['type'] }>
			).detail
			show(detail.message, detail.type)
		}
		window.addEventListener('borsaty-toast', handler)
		return () => window.removeEventListener('borsaty-toast', handler)
	}, [])
	const value = useMemo(() => ({ show }), [])
	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className="toast-stack" aria-live="polite">
				{items.map((item) => (
					<div className={`toast toast-${item.type}`} key={item.id}>
						{item.message}
					</div>
				))}
			</div>
		</ToastContext.Provider>
	)
}
export function useToast() {
	return useContext(ToastContext)
}
