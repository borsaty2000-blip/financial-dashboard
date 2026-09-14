import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type Course = {
	id: string
	title: string
	titleEn?: string
	description: string
	level: string
	category: string
	duration: number
	price: number
	isFree: boolean
	rating?: number
	totalStudents?: number
	lessons?: Lesson[]
	_count?: { lessons: number; enrollments: number }
}
type Lesson = {
	id: string
	title: string
	content: string
	duration: number
	order: number
}
type ProgressItem = {
	id: string
	course?: { title?: string }
	courseId?: string
	progress?: number
	verificationCode?: string
}

const levelLabel: Record<string, string> = {
	BEGINNER: 'مبتدئ',
	INTERMEDIATE: 'متوسط',
	ADVANCED: 'متقدم',
}

export function EducationPage({
	mode = 'catalog',
	id = '',
}: {
	mode?: 'catalog' | 'course' | 'lesson' | 'my' | 'certificates'
	id?: string
}) {
	const [courses, setCourses] = useState<Course[]>([])
	const [course, setCourse] = useState<Course | null>(null)
	const [lesson, setLesson] = useState<Lesson | null>(null)
	const [data, setData] = useState<ProgressItem[]>([])
	const [loadedKey, setLoadedKey] = useState('')
	const [message, setMessage] = useState('')
	const requestKey = `${mode}:${id}`
	const loading = loadedKey !== requestKey

	useEffect(() => {
		const path =
			mode === 'catalog'
				? '/api/courses'
				: mode === 'course'
					? `/api/courses/${id}`
					: mode === 'lesson'
						? `/api/lessons/${id}`
						: mode === 'my'
							? '/api/my/courses'
							: '/api/my/certificates'
		let active = true
		const load = async () => {
			try {
				if (mode === 'catalog') setCourses(await api<Course[]>(path))
				else if (mode === 'course') setCourse(await api<Course>(path))
				else if (mode === 'lesson') setLesson(await api<Lesson>(path))
				else setData(await api<ProgressItem[]>(path))
				if (active) setMessage('')
			} catch {
				if (active)
					setMessage(
						mode === 'catalog' || mode === 'course' || mode === 'lesson'
							? 'تعذر تحميل المحتوى التعليمي حالياً'
							: 'سجّل الدخول للوصول إلى مسارك التعليمي',
					)
			} finally {
				if (active) setLoadedKey(requestKey)
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [mode, id, requestKey])

	const enroll = async (courseId: string) => {
		try {
			await api(`/api/courses/${courseId}/enroll`, { method: 'POST' })
			setMessage('تم التسجيل في الدورة بنجاح')
		} catch {
			setMessage('يتطلب التسجيل الدخول إلى الحساب')
		}
	}
	const complete = async (lessonId: string) => {
		try {
			await api(`/api/lessons/${lessonId}/complete`, { method: 'POST' })
			setMessage('تم حفظ تقدمك')
		} catch {
			setMessage('تعذر حفظ التقدم')
		}
	}

	if (loading)
		return (
			<main className="education-page analysis-page">
				<div className="loading-screen" role="status" aria-live="polite">
					جارٍ تحميل المحتوى التعليمي...
				</div>
			</main>
		)
	const hasEmptyResult =
		(mode === 'catalog' && courses.length === 0) ||
		(mode === 'course' && !course) ||
		(mode === 'lesson' && !lesson) ||
		((mode === 'my' || mode === 'certificates') && data.length === 0)
	if (message || hasEmptyResult)
		return (
			<main className="education-page analysis-page" dir="rtl">
				<header className="page-heading">
					<p className="eyebrow">Borsaty Academy</p>
					<h1>
						{mode === 'catalog'
							? 'المحتوى التعليمي غير متاح حالياً'
							: mode === 'course'
								? 'الدورة غير متاحة'
								: mode === 'lesson'
									? 'الدرس غير متاح'
									: mode === 'my'
										? 'لا توجد دورات مسجلة بعد'
										: 'لا توجد شهادات بعد'}
					</h1>
					<p>
						{message ||
							(mode === 'catalog'
								? 'ستظهر الدورات هنا عند توفر محتوى موثوق.'
								: 'يمكنك العودة لاحقاً أو الرجوع إلى الأكاديمية.')}
					</p>
				</header>
				<a className="secondary-button" href="/education">
					العودة إلى الأكاديمية
				</a>
			</main>
		)
	if (mode === 'course' && course)
		return (
			<main className="education-page analysis-page" dir="rtl">
				<header className="page-heading">
					<p className="eyebrow">Borsaty Academy</p>
					<h1>{course.title}</h1>
					<p>{course.description}</p>
				</header>
				<section className="education-hero-card">
					<span>{levelLabel[course.level] ?? course.level}</span>
					<strong>{course.isFree ? 'مجانية' : `${course.price} USD`}</strong>
					<button
						className="primary-button"
						onClick={() => void enroll(course.id)}
					>
						ابدأ الدورة
					</button>
				</section>
				<section className="education-lesson-list">
					{(course.lessons ?? []).map((item) => (
						<article key={item.id} className="analysis-card">
							<div>
								<span>الدرس {item.order}</span>
								<h3>{item.title}</h3>
								<small>{item.duration} دقيقة</small>
							</div>
							<a
								className="secondary-button"
								href={`/education/${course.id}/lessons/${item.id}`}
							>
								فتح الدرس
							</a>
						</article>
					))}
				</section>
				{message && <p className="inline-message">{message}</p>}
			</main>
		)
	if (mode === 'lesson' && lesson)
		return (
			<main className="education-page analysis-page" dir="rtl">
				<a href="/education">← العودة إلى الأكاديمية</a>
				<header className="page-heading">
					<p className="eyebrow">درس تعليمي</p>
					<h1>{lesson.title}</h1>
					<p>{lesson.duration} دقيقة</p>
				</header>
				<article className="analysis-card lesson-content">
					<p>{lesson.content}</p>
					<button
						className="primary-button"
						onClick={() => void complete(lesson.id)}
					>
						علّمت الدرس كمكتمل
					</button>
				</article>
				{message && <p className="inline-message">{message}</p>}
			</main>
		)
	if (mode === 'my' || mode === 'certificates')
		return (
			<main className="education-page analysis-page" dir="rtl">
				<header className="page-heading">
					<p className="eyebrow">Borsaty Academy</p>
					<h1>{mode === 'my' ? 'دوراتي' : 'شهاداتي'}</h1>
				</header>
				<section className="education-grid">
					{data.map((item) => (
						<article className="analysis-card" key={item.id}>
							<h3>{item.course?.title ?? item.courseId ?? 'شهادة بورصتي'}</h3>
							<p>
								{item.progress != null
									? `التقدم ${item.progress}%`
									: `رمز التحقق: ${item.verificationCode ?? '—'}`}
							</p>
						</article>
					))}
				</section>
			</main>
		)
	return (
		<main className="education-page analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Borsaty Academy</p>
				<h1>أكاديمية بورصتي</h1>
				<p>
					تعلم التحليل المالي خطوة بخطوة، مع محتوى تعليمي واضح وليس توصية
					استثمارية.
				</p>
			</header>
			<section className="education-grid">
				{courses.map((item) => (
					<article
						className="analysis-card education-course-card"
						key={item.id}
					>
						<div className="course-badge">
							{item.isFree ? 'مجاني' : `${item.price} USD`}
						</div>
						<h2>{item.title}</h2>
						<p>{item.description}</p>
						<div className="course-meta">
							<span>{levelLabel[item.level] ?? item.level}</span>
							<span>{item.duration} دقيقة</span>
							<span>
								{item._count?.lessons ?? item.lessons?.length ?? 0} دروس
							</span>
						</div>
						<a className="primary-button" href={`/education/${item.id}`}>
							عرض الدورة
						</a>
					</article>
				))}
			</section>
		</main>
	)
}
