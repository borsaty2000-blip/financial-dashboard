import { Router } from 'express'

const document = {
	openapi: '3.0.3',
	info: {
		title: 'Borsaty API',
		version: '1.0.0',
		description:
			'واجهات بيانات وتحليل تعليمية؛ لا تنفذ صفقات ولا تقدم ضمانات استثمارية.',
	},
	servers: [{ url: '/api' }],
	paths: {
		'/health': {
			get: {
				summary: 'Health check',
				responses: { '200': { description: 'Service is healthy' } },
			},
		},
		'/financial-report': {
			get: {
				summary: 'Financial report payload',
				responses: { '200': { description: 'Report payload' } },
			},
		},
		'/market/egx/summary': {
			get: {
				summary: 'EGX summary',
				responses: {
					'200': { description: 'EGX market summary' },
					'502': { description: 'Provider unavailable' },
				},
			},
		},
		'/market/tasi/summary': {
			get: {
				summary: 'TASI summary',
				responses: {
					'200': { description: 'TASI market summary' },
					'502': { description: 'Provider unavailable' },
				},
			},
		},
		'/market/quote/{symbol}': {
			get: {
				summary: 'Quote for a symbol',
				parameters: [
					{
						name: 'symbol',
						in: 'path',
						required: true,
						schema: { type: 'string' },
					},
					{
						name: 'market',
						in: 'query',
						required: false,
						schema: {
							type: 'string',
							enum: ['EGX', 'TASI', 'GLOBAL'],
							default: 'EGX',
						},
					},
				],
				responses: {
					'200': { description: 'Quote envelope' },
					'404': { description: 'Unavailable' },
				},
			},
		},
		'/market/candles/{symbol}': {
			get: {
				summary: 'Historical candles',
				parameters: [
					{
						name: 'symbol',
						in: 'path',
						required: true,
						schema: { type: 'string' },
					},
					{
						name: 'market',
						in: 'query',
						required: false,
						schema: {
							type: 'string',
							enum: ['EGX', 'TASI', 'GLOBAL'],
							default: 'EGX',
						},
					},
					{
						name: 'days',
						in: 'query',
						required: false,
						schema: {
							type: 'integer',
							minimum: 30,
							maximum: 500,
							default: 120,
						},
					},
				],
				responses: {
					'200': { description: 'Candle envelope' },
					'404': { description: 'Unavailable' },
				},
			},
		},
		'/analysis/{symbol}/indicators': {
			get: {
				summary: 'Technical indicator snapshot',
				parameters: [
					{
						name: 'symbol',
						in: 'path',
						required: true,
						schema: { type: 'string' },
					},
				],
				responses: {
					'200': { description: 'Indicator snapshot' },
					'404': { description: 'Unavailable' },
				},
			},
		},
		'/analysis/{symbol}/consensus': {
			get: {
				summary: 'Educational consensus analysis',
				parameters: [
					{
						name: 'symbol',
						in: 'path',
						required: true,
						schema: { type: 'string' },
					},
				],
				responses: {
					'200': { description: 'Consensus envelope' },
					'404': { description: 'Unavailable' },
				},
			},
		},
	},
}

export const openApiRoutes = Router()
openApiRoutes.get('/openapi.json', (_request, response) =>
	response.json(document),
)
