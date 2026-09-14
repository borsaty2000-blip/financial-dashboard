import { describe, expect, it } from 'vitest'
import {
	formatEnglishNumber,
	formatEnglishPercent,
	formatEnglishScalar,
} from '../lib/format'

describe('English financial formatting', () => {
	it('uses Latin digits while preserving grouping and precision', () => {
		expect(formatEnglishNumber(1234567.89)).toBe('1,234,567.89')
		expect(formatEnglishNumber(null)).toBe('—')
	})

	it('formats signed percentages with Latin digits', () => {
		expect(formatEnglishPercent(2.5)).toBe('+2.50%')
		expect(formatEnglishPercent(-1.25)).toBe('-1.25%')
		expect(formatEnglishPercent(undefined)).toBe('—')
	})

	it('does not convert unavailable scalar values into fake numbers', () => {
		expect(formatEnglishScalar(undefined)).toBe('—')
		expect(formatEnglishScalar('BUY')).toBe('BUY')
	})
})
