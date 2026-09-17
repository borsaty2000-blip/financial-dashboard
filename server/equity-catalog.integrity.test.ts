import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

type Catalog = {
	items: Array<{
		symbol: string
		nameAr: string
		market: string
	}>
}

async function load(filename: string) {
	const file = path.resolve('prisma/data', filename)
	return JSON.parse(await readFile(file, 'utf8')) as Catalog
}

test('equity catalogs contain complete unique EGX and TASI reference sets', async () => {
	const [egx, tasi] = await Promise.all([
		load('egx-companies.json'),
		load('tasi-companies.json'),
	])
	assert.equal(egx.items.length, 145)
	assert.equal(tasi.items.length, 419)
	for (const [market, catalog] of [
		['EGX', egx],
		['TASI', tasi],
	] as const) {
		const symbols = catalog.items.map((item) => item.symbol)
		assert.equal(
			new Set(symbols).size,
			symbols.length,
			`${market} duplicate symbol`,
		)
		assert.ok(catalog.items.every((item) => item.market === market))
		assert.ok(catalog.items.every((item) => item.symbol && item.nameAr))
	}
	assert.ok(egx.items.some((item) => item.symbol === 'COMI'))
	assert.ok(egx.items.some((item) => item.symbol === 'IEEC'))
	assert.ok(tasi.items.some((item) => item.symbol === '1010'))
	assert.ok(tasi.items.some((item) => item.symbol === '2222'))
})
