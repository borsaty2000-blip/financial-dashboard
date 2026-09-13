import { z } from 'zod'

export const checkAchievementSchema = z
	.object({
		action: z
			.string()
			.trim()
			.min(1)
			.max(50)
			.regex(/^[A-Z0-9_]+$/),
	})
	.strict()
export type CheckAchievementInput = z.infer<typeof checkAchievementSchema>
