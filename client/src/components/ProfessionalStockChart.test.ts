import { describe, expect, it } from 'vitest'
import { calculateMACD, calculateRSI } from './ProfessionalStockChart'

describe('ProfessionalStockChart indicator calculations', () => {
	it('calculates RSI in the bounded 0..100 range after warmup', () => {
		const prices = Array.from({ length: 30 }, (_, index) => 100 + index)
		const values = calculateRSI(prices)
		const last = values.at(-1)
		expect(last).toBeDefined()
		expect(last).toBeGreaterThanOrEqual(0)
		expect(last).toBeLessThanOrEqual(100)
		expect(last).toBeGreaterThan(70)
	})

	it('keeps MACD and signal aligned and produces a histogram', () => {
		const prices = Array.from(
			{ length: 80 },
			(_, index) => 100 + Math.sin(index / 3) * 4 + index * 0.2,
		)
		const result = calculateMACD(prices)
		expect(result.line).toHaveLength(prices.length)
		expect(result.signal).toHaveLength(prices.length)
		expect(result.histogram).toHaveLength(prices.length)
		expect(result.line.some(Number.isFinite)).toBe(true)
		expect(result.signal.some(Number.isFinite)).toBe(true)
	})
})
