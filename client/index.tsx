import { createRoot } from 'react-dom/client'
import { App } from '@client/App'
import '@client/styles.css'

declare global {
	interface Window {
		dataLayer: unknown[][]
		gtag: (...args: unknown[]) => void
	}
}

document.documentElement.lang = 'ar'
document.documentElement.dir = 'rtl'

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
if (measurementId) {
	const script = document.createElement('script')
	script.async = true
	script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
	document.head.appendChild(script)
	window.dataLayer = window.dataLayer || []
	window.gtag = (...args: unknown[]) => window.dataLayer.push(args)
	window.gtag('js', new Date())
	window.gtag('config', measurementId, { anonymize_ip: true })
}
const rootElement = document.getElementById('app')
if (!rootElement) throw new Error('Root element "#app" was not found')
createRoot(rootElement).render(<App />)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
	navigator.serviceWorker.register('/sw.js').catch(() => undefined)
}
