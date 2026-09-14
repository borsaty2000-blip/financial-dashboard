import { randomBytes } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

export async function issueCertificate(userId: string, courseId: string) {
	const enrollment = await prisma.courseEnrollment.findUnique({
		where: { userId_courseId: { userId, courseId } },
		include: { course: true },
	})
	if (!enrollment || enrollment.progress < 100)
		throw new Error('COURSE_NOT_COMPLETED')
	const existing = await prisma.certificate.findFirst({
		where: { userId, courseId },
	})
	if (existing) return existing
	const verificationCode = `BORSATY-${randomBytes(6).toString('hex').toUpperCase()}`
	const certificate = await prisma.certificate.create({
		data: {
			userId,
			courseId,
			certificateUrl: `/api/courses/certificates/${verificationCode}.pdf`,
			verificationCode,
		},
	})
	await prisma.courseEnrollment.update({
		where: { id: enrollment.id },
		data: { certificateId: certificate.id },
	})
	return certificate
}

export function myCertificates(userId: string) {
	return prisma.certificate.findMany({
		where: { userId },
		orderBy: { issuedAt: 'desc' },
	})
}

export function verifyCertificate(code: string) {
	return prisma.certificate.findUnique({ where: { verificationCode: code } })
}
