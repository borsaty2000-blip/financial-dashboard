import type { Request, Response } from 'express'
import {
	deleteAccount,
	getMyProfile,
	getPublicProfile,
	updateInterests,
	updateProfile,
	uploadAvatar,
} from '../services/profile/profile.service.js'
import {
	updateInterestsSchema,
	updateProfileSchema,
} from '../validators/profile.validator.js'

const sendError = (res: Response, error: unknown) =>
	res.status(400).json({
		error: error instanceof Error ? error.message : 'تعذر تحديث الملف الشخصي',
	})
export async function getMyProfileController(req: Request, res: Response) {
	try {
		const profile = await getMyProfile(req.userId!)
		if (!profile) return res.status(404).json({ error: 'المستخدم غير موجود' })
		res.json({ profile })
	} catch (error) {
		sendError(res, error)
	}
}
export async function updateProfileController(req: Request, res: Response) {
	try {
		res.json({
			profile: await updateProfile(
				req.userId!,
				updateProfileSchema.parse(req.body),
			),
		})
	} catch (error) {
		sendError(res, error)
	}
}
export async function uploadAvatarController(req: Request, res: Response) {
	try {
		if (!req.file) return res.status(400).json({ error: 'الصورة مطلوبة' })
		res.json({ profile: await uploadAvatar(req.userId!, req.file) })
	} catch (error) {
		sendError(res, error)
	}
}
export async function deleteAccountController(req: Request, res: Response) {
	try {
		res.json(await deleteAccount(req.userId!))
	} catch (error) {
		sendError(res, error)
	}
}
export async function publicProfileController(req: Request, res: Response) {
	try {
		const profile = await getPublicProfile(req.params.username, req.userId)
		if (!profile) return res.status(404).json({ error: 'الملف غير موجود' })
		res.json({ profile })
	} catch (error) {
		sendError(res, error)
	}
}
export async function updateInterestsController(req: Request, res: Response) {
	try {
		res.json({
			interests: await updateInterests(
				req.userId!,
				updateInterestsSchema.parse(req.body),
			),
		})
	} catch (error) {
		sendError(res, error)
	}
}
