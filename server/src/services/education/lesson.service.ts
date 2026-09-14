import { prisma } from '../../lib/prisma.js'

export async function listLessons(courseId: string) {
	return prisma.lesson.findMany({
		where: { courseId },
		orderBy: { order: 'asc' },
	})
}

export async function getLesson(id: string) {
	return prisma.lesson.findUnique({ where: { id }, include: { course: true } })
}

export async function completeLesson(userId: string, lessonId: string) {
	const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } })
	if (!lesson) throw new Error('LESSON_NOT_FOUND')
	const enrollment = await prisma.courseEnrollment.findUnique({
		where: { userId_courseId: { userId, courseId: lesson.courseId } },
	})
	if (!enrollment) throw new Error('NOT_ENROLLED')
	const completed = Array.from(
		new Set([...enrollment.completedLessons, lessonId]),
	)
	const total = await prisma.lesson.count({
		where: { courseId: lesson.courseId },
	})
	const progress = total ? Math.round((completed.length / total) * 100) : 0
	return prisma.courseEnrollment.update({
		where: { id: enrollment.id },
		data: {
			completedLessons: completed,
			progress,
			completedAt: progress === 100 ? new Date() : null,
		},
	})
}
