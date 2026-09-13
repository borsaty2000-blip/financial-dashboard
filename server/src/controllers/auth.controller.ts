import type { NextFunction, Request, Response } from 'express'
import {
	login,
	logout,
	refreshToken,
	register,
	getCurrentUser,
} from '../services/auth/auth.service.js'
import { loginSchema, registerSchema } from '../validators/auth.validator.js'
import {
	forgotPasswordSchema,
	resetPasswordSchema,
} from '../validators/auth.validator.js'
import {
	requestReset,
	resetPassword,
	validateResetToken,
} from '../services/auth/passwordReset.service.js'

const meta = (req: Request) => ({
	userAgent: req.get('user-agent'),
	ipAddress: req.ip,
})
const sendError = (res: Response, error: unknown) => {
	const message = error instanceof Error ? error.message : 'حدث خطأ في المصادقة'
	const status =
		message.includes('خطأ في') || message.includes('Invalid token') ? 401 : 400
	res.status(status).json({ error: message })
}
export async function registerController(req: Request, res: Response) {
	try {
		const input = registerSchema.parse(req.body)
		res.status(201).json(await register(input, meta(req)))
	} catch (error) {
		sendError(res, error)
	}
}
export async function loginController(req: Request, res: Response) {
	try {
		const input = loginSchema.parse(req.body)
		res.json(await login(input, meta(req)))
	} catch (error) {
		sendError(res, error)
	}
}
export async function logoutController(req: Request, res: Response) {
	try {
		const token =
			req.body?.refreshToken ??
			req.headers.authorization?.replace(/^Bearer\s+/i, '')
		if (!token) return res.status(400).json({ error: 'refreshToken مطلوب' })
		res.json(await logout(token))
	} catch (error) {
		sendError(res, error)
	}
}
export async function refreshController(req: Request, res: Response) {
	try {
		const token = req.body?.refreshToken
		if (!token) return res.status(400).json({ error: 'refreshToken مطلوب' })
		res.json(await refreshToken(token, meta(req)))
	} catch (error) {
		sendError(res, error)
	}
}
export async function meController(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		if (!req.userId) return res.status(401).json({ error: 'غير مصرح' })
		const user = await getCurrentUser(req.userId)
		if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' })
		res.json({ user })
	} catch (error) {
		next(error)
	}
}

export async function forgotPasswordController(req: Request, res: Response) {
	try {
		const { email } = forgotPasswordSchema.parse(req.body)
		res.json(await requestReset(email))
	} catch (error) {
		res.status(400).json({
			error: error instanceof Error ? error.message : 'تعذر تنفيذ الطلب',
		})
	}
}

export async function verifyResetTokenController(req: Request, res: Response) {
	res.json(await validateResetToken(req.params.token))
}

export async function resetPasswordController(req: Request, res: Response) {
	try {
		const { token, newPassword } = resetPasswordSchema.parse(req.body)
		res.json(await resetPassword(token, newPassword))
	} catch (error) {
		res.status(400).json({
			error: error instanceof Error ? error.message : 'تعذر تغيير كلمة المرور',
		})
	}
}
