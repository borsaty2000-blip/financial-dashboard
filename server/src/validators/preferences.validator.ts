import { z } from 'zod'

export const updatePreferencesSchema = z
	.object({
		preferredMarkets: z.array(z.string().trim().min(1).max(20)).max(10),
		experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
		investmentStyle: z.enum(['CONSERVATIVE', 'BALANCED', 'GROWTH']),
		preferredSectors: z.array(z.string().trim().min(1).max(40)).max(20),
		dailyTimeCommitment: z.enum(['LOW', 'MEDIUM', 'HIGH']),
	})
	.strict()
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
