import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type TasiImport = {
	items: Array<{
		sourceCode: string
		symbol: string
		nameAr: string
		market: 'TASI'
		currency: 'SAR'
	}>
}

async function main() {
	const input = JSON.parse(
		await readFile(
			new URL('./data/tasi-companies.json', import.meta.url),
			'utf8',
		),
	) as TasiImport
	let imported = 0
	let updated = 0
	let skipped = 0
	for (const item of input.items) {
		try {
			const existing = await prisma.tasiCompany.findUnique({
				where: { sourceCode: item.sourceCode },
			})
			await prisma.tasiCompany.upsert({
				where: { sourceCode: item.sourceCode },
				create: item,
				update: {
					symbol: item.symbol,
					nameAr: item.nameAr,
					market: item.market,
					currency: item.currency,
				},
			})
			if (existing) updated += 1
			else imported += 1
		} catch (error) {
			skipped += 1
			console.error(
				'TASI row failed:',
				item.symbol,
				error instanceof Error ? error.message : error,
			)
		}
	}
	const count = await prisma.tasiCompany.count({ where: { market: 'TASI' } })
	console.log(
		JSON.stringify({ imported, updated, skipped, totalTasiCompanies: count }),
	)
}

main()
	.catch((error) => {
		console.error(
			'TASI import failed:',
			error instanceof Error ? error.message : error,
		)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
