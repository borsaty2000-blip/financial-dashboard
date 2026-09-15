import assert from 'node:assert/strict'
import test from 'node:test'
import { ConsensusService } from './src/services/analysis/consensus.service.ts'
import {
	getInsiderTrades,
	getOwnership,
} from './src/services/governance/governance.service.ts'
import { SentimentService } from './src/services/analysis/sentiment.service.ts'

test('consensus is explicitly non-executable and confidence is not probability', async () => {
	const result = await ConsensusService.calculate(
		'COMI',
		Array.from({ length: 60 }, (_, index) => 100 + index * 0.2),
	)
	assert.equal(result.decision, 'NO_TRADE_DECISION')
	assert.equal(result.confidenceMeaning, 'agreement_score_not_probability')
	assert.match(result.recommendation, /لا يوجد قرار شراء أو بيع آلي/)
})

test('governance never fabricates insider trades or ownership percentages', async () => {
	const [trades, ownership] = await Promise.all([
		getInsiderTrades('COMI'),
		getOwnership('COMI'),
	])
	assert.equal(
		trades.some((item) => item.source === 'manual-seed'),
		false,
	)
	assert.equal(ownership.available, false)
	assert.equal(ownership.shareholders.length, 0)
})

test('market mood uses weighted analysis inputs instead of news-zero defaults', () => {
	const mood = SentimentService.calculateMarketMood('COMI', {
		consensus: 72,
		rsi: 48.62,
		macd: 'bullish',
		volume: 100000,
		priceChange: 0.74,
	})
	assert.equal(mood.available, true)
	assert.equal(mood.score, 100)
	assert.equal(mood.positive, 100)
	assert.equal(mood.negative, 0)
})

test('market mood remains unavailable when no analytical inputs exist', () => {
	const mood = SentimentService.calculateMarketMood('UNKNOWN', {
		consensus: null,
		rsi: null,
		macd: null,
		volume: null,
		priceChange: null,
	})
	assert.equal(mood.available, false)
	assert.equal(mood.score, 0)
})
