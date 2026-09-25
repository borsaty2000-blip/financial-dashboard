import type { Candle } from './candles.service.js'

export type QualityValidation = {
	valid: boolean
	clean: Candle[]
	issues: string[]
	removed: number
}

/** Defensive validation gate for every analysis input. It never invents candles. */
export class QualityGuardian {
	static validate(candles: Candle[], minimum = 30): QualityValidation {
		const issues: string[] = []
		const clean: Candle[] = []
		const seen = new Set<string>()

		for (const candle of candles) {
			const date = String(candle.date ?? '')
			const values = [candle.open, candle.high, candle.low, candle.close, candle.volume]
			if (!date || seen.has(date)) {
				issues.push(!date ? 'missing_date' : `duplicate_date:${date}`)
				continue
			}
			if (!values.every(Number.isFinite) || candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0) {
				issues.push(`invalid_numeric_values:${date}`)
				continue
			}
			if (candle.high < Math.max(candle.open, candle.close) || candle.low > Math.min(candle.open, candle.close) || candle.high < candle.low) {
				issues.push(`invalid_ohlc_range:${date}`)
				continue
			}
			seen.add(date)
			clean.push({ ...candle, date })
		}

		clean.sort((a, b) => String(a.date).localeCompare(String(b.date)))
		return { valid: clean.length >= minimum, clean, issues, removed: candles.length - clean.length }
	}

	static isStale(timestamp: string | null | undefined, thresholdHours = 24): boolean {
		if (!timestamp) return true
		const time = new Date(timestamp).getTime()
		return !Number.isFinite(time) || Date.now() - time > thresholdHours * 60 * 60 * 1000
	}
}
