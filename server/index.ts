import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import express from 'express'

const app = express()
const port = 4000

const rawData = await readFile(new URL('./data.json', import.meta.url), 'utf8')

const financialData: unknown = JSON.parse(rawData)
const avatarsDirectory = fileURLToPath(new URL('./avatars', import.meta.url))

app.get('/api/avatars/:fileName', (request, response, next) => {
	response.sendFile(
		request.params.fileName,
		{ root: avatarsDirectory },
		(error) => {
			if (error) {
				next(error)
			}
		},
	)
})

app.get('/api/financial-report', (_request, response) => {
	response.json(financialData)
})

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`)
})
