import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type EgxImport = {
	items: Array<{
		sourceCode: string
		symbol: string
		nameAr: string
		market: 'EGX'
	}>
}

async function main() {
	const input = JSON.parse(
		await readFile(
			new URL('./data/egx-companies.json', import.meta.url),
			'utf8',
		),
	) as EgxImport
	let imported = 0
	for (const item of input.items) {
		await prisma.egxCompany.upsert({
			where: { sourceCode: item.sourceCode },
			create: item,
			update: { symbol: item.symbol, nameAr: item.nameAr, market: item.market },
		})
		imported += 1
	}
	const count = await prisma.egxCompany.count({ where: { market: 'EGX' } })
	console.log(JSON.stringify({ imported, totalEgxCompanies: count }))
}

main()
	.catch((error) => {
		console.error(
			'EGX import failed:',
			error instanceof Error ? error.message : error,
		)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
