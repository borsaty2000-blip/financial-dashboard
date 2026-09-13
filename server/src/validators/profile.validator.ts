import { z } from 'zod'

export const updateProfileSchema = z
	.object({
		fullName: z.string().trim().max(120).optional(),
		bio: z.string().trim().max(500).optional(),
		country: z.string().trim().length(2).optional(),
		language: z.string().trim().min(2).max(5).optional(),
	})
	.strict()
export const updateInterestsSchema = z
	.object({
		preferredMarkets: z
			.array(z.string().trim().min(1).max(20))
			.max(10)
			.optional(),
		experienceLevel: z.string().trim().max(30).optional(),
		investmentStyle: z.string().trim().max(30).optional(),
		preferredSectors: z
			.array(z.string().trim().min(1).max(40))
			.max(20)
			.optional(),
		dailyTimeCommitment: z.string().trim().max(20).optional(),
		theme: z.enum(['light', 'dark']).optional(),
		emailNotifications: z.boolean().optional(),
		pushNotifications: z.boolean().optional(),
	})
	.strict()
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdateInterestsInput = z.infer<typeof updateInterestsSchema>
