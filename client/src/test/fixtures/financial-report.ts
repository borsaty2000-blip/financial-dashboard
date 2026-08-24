import { type FinancialReport } from '@client/modules/financial-report/types/financial-report'

export const financialReportFixture: FinancialReport = {
	periods: ['2024-02-01'],
	company: {
		id: 'company',
		name: 'Company',
		values: [40],
		children: [
			{
				id: 'branch-1',
				name: 'Branch 1',
				values: [13],
				children: [
					{
						id: 'employee-1',
						name: 'Anna Blackwood',
						imageUrl: '/api/avatars/anna-blackwood.png',
						values: [13],
						children: [
							{
								id: 'employee-1-existing',
								name: 'Existing clients',
								values: [10],
								children: [],
							},
							{
								id: 'employee-1-organic',
								name: 'New organic',
								values: [2],
								children: [],
							},
							{
								id: 'employee-1-paid',
								name: 'New paid',
								values: [1],
								children: [],
							},
						],
					},
				],
			},
			{
				id: 'branch-2',
				name: 'Branch 2',
				values: [27],
				children: [
					{
						id: 'employee-2',
						name: 'James Walker',
						imageUrl: '/api/avatars/default-user.png',
						values: [27],
						children: [
							{
								id: 'employee-2-existing',
								name: 'Existing clients',
								values: [25],
								children: [],
							},
							{
								id: 'employee-2-organic',
								name: 'New organic',
								values: [1],
								children: [],
							},
							{
								id: 'employee-2-paid',
								name: 'New paid',
								values: [1],
								children: [],
							},
						],
					},
				],
			},
		],
	},
}
