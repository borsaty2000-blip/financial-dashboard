import { describe, expect, it } from 'vitest'
import { formatPeriod } from '@client/modules/financial-report/application/utils/format-period'

describe('formatPeriod', () => {
	it('formats an ISO period for the chart and table', () => {
		expect(formatPeriod('2024-02-01')).toBe('Feb 2024')
	})
})
