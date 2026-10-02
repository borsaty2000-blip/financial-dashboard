import assert from 'node:assert/strict'
import test from 'node:test'
import { makeDataQuality, qualityForSeries } from '../src/services/market/data-quality.js'

const now = () => new Date().toISOString()
const ago = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString()

test('age below five minutes is live', () => assert.equal(makeDataQuality({ status: 'live', timestamp: ago(299) }).status, 'live'))
test('age at five minutes is same_day', () => assert.equal(makeDataQuality({ status: 'live', timestamp: ago(300) }).status, 'same_day'))
test('age below one day is same_day', () => assert.equal(makeDataQuality({ status: 'delayed', timestamp: ago(86399) }).status, 'same_day'))
test('age at one day is historical', () => assert.equal(makeDataQuality({ status: 'delayed', timestamp: ago(86400) }).status, 'historical'))
test('freshness Arabic live label', () => assert.equal(makeDataQuality({ status: 'live', timestamp: now() }).freshness_ar, 'محدّث الآن'))
test('freshness Arabic same-day label', () => assert.equal(makeDataQuality({ status: 'delayed', timestamp: ago(3600) }).freshness_ar, 'محدّث اليوم'))
test('freshness Arabic historical label', () => assert.equal(makeDataQuality({ status: 'historical', timestamp: ago(90000) }).freshness_ar, 'تاريخي'))
test('provider is always market', () => assert.equal(makeDataQuality({ status: 'live', provider: 'Yahoo Finance', timestamp: now() }).provider, 'market'))
test('provider is market for Stooq', () => assert.equal(makeDataQuality({ status: 'historical', provider: 'Stooq', timestamp: ago(90000) }).provider, 'market'))
test('age_seconds is numeric', () => assert.equal(typeof makeDataQuality({ status: 'live', timestamp: now() }).age_seconds, 'number'))
test('custom warnings are retained', () => assert.deepEqual(makeDataQuality({ status: 'historical', timestamp: ago(90000), warnings: ['fixture'] }).warnings, ['fixture']))
test('duplicate warnings are removed', () => assert.deepEqual(makeDataQuality({ status: 'historical', timestamp: ago(90000), warnings: ['x', 'x'] }).warnings, ['x']))
test('cached series is historical', () => assert.equal(qualityForSeries('Yahoo Finance', 'cached', ago(90000)).status, 'historical'))
test('delayed series is same-day when timestamp is fresh', () => assert.equal(qualityForSeries('SAHMK', 'delayed', ago(3600)).status, 'same_day'))
test('no delayed status is emitted', () => {
	const values = ['live', 'same_day', 'historical']
	assert.ok(values.includes(makeDataQuality({ status: 'delayed', timestamp: ago(3600) }).status))
	assert.notEqual(makeDataQuality({ status: 'delayed', timestamp: ago(3600) }).status, 'delayed')
})
test('unavailable remains safe and provider-neutral', () => {
	const value = makeDataQuality({ status: 'unavailable', provider: 'Yahoo Finance' })
	assert.equal(value.status, 'unavailable')
	assert.equal(value.provider, 'market')
})
