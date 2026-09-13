import type { Request, Response } from 'express'
import {
	getPersonalizedDashboard,
	getPreferences,
	updatePreferences,
} from '../services/profile/preferences.service.js'
import { updatePreferencesSchema } from '../validators/preferences.validator.js'

const sendError = (res: Response, error: unknown) =>
	res.status(400).json({
		error: error instanceof Error ? error.message : 'تعذر تحديث التفضيلات',
	})
export async function getPreferencesController(req: Request, res: Response) {
	try {
		const preferences = await getPreferences(req.userId!)
		res.json({ preferences })
	} catch (error) {
		sendError(res, error)
	}
}
export async function updatePreferencesController(req: Request, res: Response) {
	try {
		const preferences = await updatePreferences(
			req.userId!,
			updatePreferencesSchema.parse(req.body),
		)
		res.json({ preferences })
	} catch (error) {
		sendError(res, error)
	}
}
export async function personalizedDashboardController(
	req: Request,
	res: Response,
) {
	try {
		res.json(await getPersonalizedDashboard(req.userId!))
	} catch (error) {
		sendError(res, error)
	}
}
