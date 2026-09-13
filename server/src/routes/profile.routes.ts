import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
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
mkdirSync(uploadDirectory, { recursive: true })
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
const upload = multer({
	storage: multer.diskStorage({
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
	}),
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
	upload.single('avatar'),
	uploadAvatarController,
)
profileRoutes.delete('/', requireAuth, deleteAccountController)
profileRoutes.put('/interests', requireAuth, updateInterestsController)
profileRoutes.get('/:username', publicProfileController)
