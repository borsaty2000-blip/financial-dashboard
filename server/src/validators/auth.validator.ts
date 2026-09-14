import { z } from 'zod'

export const registerSchema = z.object({
	email: z.string().trim().toLowerCase().email(),
	username: z
		.string()
		.trim()
		.min(3)
		.max(30)
		.regex(/^[a-zA-Z0-9_.]+$/),
	password: z
		.string()
		.min(8)
		.regex(/[A-Za-z]/)
		.regex(/[0-9]/),
	fullName: z.string().trim().max(120).optional(),
	country: z.string().length(2).default('EG'),
	language: z.string().min(2).max(5).default('ar'),
})
export const loginSchema = z.object({
	identifier: z.string().trim().min(1),
	password: z.string().min(1),
	twoFactorCode: z.string().regex(/^\d{6}$/).optional(),
})
export const forgotPasswordSchema = z.object({
	email: z.string().trim().toLowerCase().email(),
})
export const resetPasswordSchema = z.object({
	token: z.string().trim().min(32),
	newPassword: z
		.string()
		.min(8)
		.regex(/[A-Za-z]/)
		.regex(/[0-9]/),
})
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
