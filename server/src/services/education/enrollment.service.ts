import { prisma } from '../../lib/prisma.js'

export async function enroll(userId: string, courseId: string) {
	const course = await prisma.course.findUnique({ where: { id: courseId } })
	if (!course || !course.isPublished) throw new Error('COURSE_NOT_FOUND')
	const alreadyEnrolled = await prisma.courseEnrollment.findUnique({
		where: { userId_courseId: { userId, courseId } },
	})
	return prisma.$transaction(async (tx) => {
		const enrollment = await tx.courseEnrollment.upsert({
			where: { userId_courseId: { userId, courseId } },
			update: {},
			create: { userId, courseId },
			include: { course: true },
		})
		if (!alreadyEnrolled)
			await tx.course.update({
				where: { id: courseId },
				data: { totalStudents: { increment: 1 } },
			})
		return enrollment
	})
}

export function myCourses(userId: string) {
	return prisma.courseEnrollment.findMany({
		where: { userId },
		include: {
			course: { include: { lessons: { orderBy: { order: 'asc' } } } },
		},
		orderBy: { enrolledAt: 'desc' },
	})
}
