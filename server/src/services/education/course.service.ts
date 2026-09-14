import { prisma } from '../../lib/prisma.js'
import { educationCatalog, lessonTemplates } from './catalog.js'

export async function listCourses(
	filters: { level?: string; category?: string } = {},
) {
	try {
		return await prisma.course.findMany({
			where: {
				isPublished: true,
				...(filters.level ? { level: filters.level } : {}),
				...(filters.category ? { category: filters.category } : {}),
			},
			include: { _count: { select: { lessons: true, enrollments: true } } },
			orderBy: [{ isFree: 'desc' }, { createdAt: 'asc' }],
		})
	} catch {
		return educationCatalog.map((course, index) => ({
			...course,
			id: `catalog-${index + 1}`,
			isPublished: true,
			rating: 0,
			totalStudents: 0,
			lessons: lessonTemplates(course.title),
			_count: { lessons: 3, enrollments: 0 },
		}))
	}
}

export async function getCourse(id: string) {
	try {
		return await prisma.course.findUnique({
			where: { id },
			include: { lessons: { orderBy: { order: 'asc' } } },
		})
	} catch {
		const index = Number(id.replace('catalog-', '')) - 1
		const course = educationCatalog[index]
		return course
			? {
					...course,
					id,
					isPublished: true,
					rating: 0,
					totalStudents: 0,
					lessons: lessonTemplates(course.title),
				}
			: null
	}
}

export async function createCourse(data: Record<string, unknown>) {
	return prisma.course.create({ data: data as never })
}

export async function updateCourse(id: string, data: Record<string, unknown>) {
	return prisma.course.update({ where: { id }, data: data as never })
}
