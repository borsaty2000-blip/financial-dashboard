import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import {
	createCourse,
	getCourse,
	listCourses,
	updateCourse,
} from '../services/education/course.service.js'
import {
	completeLesson,
	getLesson,
	listLessons,
} from '../services/education/lesson.service.js'
import { enroll, myCourses } from '../services/education/enrollment.service.js'
import {
	issueCertificate,
	myCertificates,
	verifyCertificate,
} from '../services/education/certificate.service.js'

export const educationRoutes = Router()
const courseInput = z.object({
	title: z.string().min(3),
	titleEn: z.string().optional(),
	description: z.string().min(10),
	level: z.string(),
	category: z.string(),
	duration: z.number().int().positive(),
	thumbnail: z.string().url().optional(),
	price: z.number().min(0).default(0),
	isFree: z.boolean().default(true),
	isPublished: z.boolean().default(false),
})

educationRoutes.get('/courses', async (request, response) =>
	response.json(
		await listCourses({
			level:
				typeof request.query.level === 'string'
					? request.query.level
					: undefined,
			category:
				typeof request.query.category === 'string'
					? request.query.category
					: undefined,
		}),
	),
)
educationRoutes.get('/courses/:id', async (request, response) => {
	const course = await getCourse(request.params.id)
	return course
		? response.json(course)
		: response.status(404).json({ error: 'الدورة غير موجودة' })
})
educationRoutes.post('/courses', requireAdmin, async (request, response) => {
	const parsed = courseInput.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات الدورة غير صالحة' })
	return response.status(201).json(await createCourse(parsed.data))
})
educationRoutes.put('/courses/:id', requireAdmin, async (request, response) => {
	const parsed = courseInput.partial().safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات الدورة غير صالحة' })
	return response.json(await updateCourse(request.params.id, parsed.data))
})
educationRoutes.get('/courses/:id/lessons', async (request, response) =>
	response.json(await listLessons(request.params.id)),
)
educationRoutes.get('/lessons/:id', async (request, response) => {
	const lesson = await getLesson(request.params.id)
	return lesson
		? response.json(lesson)
		: response.status(404).json({ error: 'الدرس غير موجود' })
})
educationRoutes.post(
	'/lessons/:id/complete',
	requireAuth,
	async (request, response) => {
		try {
			return response.json(
				await completeLesson(request.userId!, request.params.id),
			)
		} catch (error) {
			return response
				.status(
					error instanceof Error && error.message === 'NOT_ENROLLED'
						? 403
						: 404,
				)
				.json({ error: 'تعذر إكمال الدرس' })
		}
	},
)
educationRoutes.post(
	'/courses/:id/enroll',
	requireAuth,
	async (request, response) => {
		try {
			return response
				.status(201)
				.json(await enroll(request.userId!, request.params.id))
		} catch {
			return response.status(404).json({ error: 'الدورة غير متاحة للتسجيل' })
		}
	},
)
educationRoutes.get('/my/courses', requireAuth, async (request, response) =>
	response.json(await myCourses(request.userId!)),
)
educationRoutes.get(
	'/my/certificates',
	requireAuth,
	async (request, response) =>
		response.json(await myCertificates(request.userId!)),
)
educationRoutes.post(
	'/courses/:id/certificate',
	requireAuth,
	async (request, response) => {
		try {
			return response
				.status(201)
				.json(await issueCertificate(request.userId!, request.params.id))
		} catch {
			return response.status(409).json({ error: 'أكمل جميع الدروس أولاً' })
		}
	},
)
educationRoutes.get('/certificates/verify/:code', async (request, response) => {
	const certificate = await verifyCertificate(request.params.code)
	return certificate
		? response.json({ valid: true, certificate })
		: response.status(404).json({ valid: false })
})
