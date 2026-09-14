import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { Router, type RequestHandler } from 'express'
import multer from 'multer'
import {
	deleteAccountController,
	getMyProfileController,
	publicProfileController,
	updateInterestsController,
	updateProfileController,
	uploadAvatarController,
} from '../controllers/profile.controller.js'
import { requireAuth } from '../middleware/auth.js'

const uploadDirectory = path.join(process.cwd(), 'server', 'uploads', 'avatars')
if (!process.env.VERCEL) mkdirSync(uploadDirectory, { recursive: true })
const requirePersistentAvatarStorage: RequestHandler = (
	_request,
	response,
	next,
) => {
	if (process.env.VERCEL) {
		response.status(503).json({
			error: 'رفع الصورة غير متاح مؤقتاً حتى يتم ربط تخزين ملفات دائم بالخادم.',
		})
		return
	}
	next()
}
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
const storage = process.env.VERCEL
	? multer.memoryStorage()
	: multer.diskStorage({
			destination: uploadDirectory,
			filename: (req, file, callback) => {
				const ext =
					path.extname(file.originalname).toLowerCase() ||
					(file.mimetype === 'image/png'
						? '.png'
						: file.mimetype === 'image/webp'
							? '.webp'
							: '.jpg')
				callback(null, `${req.userId}-${Date.now()}${ext}`)
			},
		})
const upload = multer({
	storage,
	limits: { fileSize: 2 * 1024 * 1024 },
	fileFilter: (_req, file, callback) =>
		callback(null, allowed.has(file.mimetype)),
})
export const profileRoutes = Router()
profileRoutes.get('/', requireAuth, getMyProfileController)
profileRoutes.put('/', requireAuth, updateProfileController)
profileRoutes.post(
	'/avatar',
	requireAuth,
	requirePersistentAvatarStorage,
	upload.single('avatar'),
	uploadAvatarController,
)
profileRoutes.delete('/', requireAuth, deleteAccountController)
profileRoutes.put('/interests', requireAuth, updateInterestsController)
profileRoutes.get('/:username', publicProfileController)
