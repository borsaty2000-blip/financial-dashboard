import { useRef, useState } from 'react'
import { api } from '../lib/api'

export default function AvatarUploader({
	currentUrl,
	onUploaded,
}: {
	currentUrl?: string | null
	onUploaded: (url: string) => void
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [preview, setPreview] = useState(currentUrl ?? '')
	const [progress, setProgress] = useState(0)
	const [error, setError] = useState('')
	const [busy, setBusy] = useState(false)
	const upload = async (file?: File) => {
		if (!file) return
		setError('')
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
			return setError('الصيغة المسموحة JPG أو PNG أو WebP')
		if (file.size > 2 * 1024 * 1024)
			return setError('حجم الصورة يجب ألا يتجاوز 2MB')
		setPreview(URL.createObjectURL(file))
		setBusy(true)
		setProgress(25)
		try {
			const form = new FormData()
			form.append('avatar', file)
			setProgress(60)
			const result = await api<{ profile: { avatarUrl?: string | null } }>(
				'/api/profile/avatar',
				{ method: 'POST', body: form },
			)
			setProgress(100)
			onUploaded(result.profile.avatarUrl ?? '')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'تعذر رفع الصورة')
			setProgress(0)
		} finally {
			setBusy(false)
		}
	}
	return (
		<div
			className="avatar-uploader"
			onDragOver={(e) => e.preventDefault()}
			onDrop={(e) => {
				e.preventDefault()
				void upload(e.dataTransfer.files[0])
			}}
		>
			<button
				type="button"
				className="avatar-preview"
				onClick={() => inputRef.current?.click()}
				disabled={busy}
			>
				{preview ? (
					<img src={preview} alt="معاينة الصورة الشخصية" />
				) : (
					<span>أضف صورتك</span>
				)}
			</button>
			<input
				ref={inputRef}
				hidden
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onChange={(e) => void upload(e.target.files?.[0])}
			/>
			<p>اسحب الصورة هنا أو اضغط للاختيار — 2MB كحد أقصى</p>
			{busy && <progress max="100" value={progress} />}
			{error && <small className="error-text">{error}</small>}
		</div>
	)
}
