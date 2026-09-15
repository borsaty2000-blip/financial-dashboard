import { useEffect, useState } from 'react'

type InstallEvent = Event & {
	prompt: () => Promise<void>
	userChoice: Promise<{ outcome: string }>
}

export default function InstallPrompt() {
	const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
	const [dismissed, setDismissed] = useState(false)
	useEffect(() => {
		const onBeforeInstall = (event: Event) => {
			event.preventDefault()
			setInstallEvent(event as InstallEvent)
		}
		window.addEventListener('beforeinstallprompt', onBeforeInstall)
		return () =>
			window.removeEventListener('beforeinstallprompt', onBeforeInstall)
	}, [])
	if (!installEvent || dismissed) return null
	return (
		<div
			className="install-prompt"
			dir="rtl"
			role="dialog"
			aria-label="تثبيت borsatyai"
		>
			<div>
				<strong>ثبّت borsatyai</strong>
				<small>وصول أسرع من شاشة جهازك</small>
			</div>
			<button onClick={() => void installEvent.prompt()}>تثبيت</button>
			<button
				className="install-dismiss"
				aria-label="إغلاق"
				onClick={() => setDismissed(true)}
			>
				×
			</button>
		</div>
	)
}
