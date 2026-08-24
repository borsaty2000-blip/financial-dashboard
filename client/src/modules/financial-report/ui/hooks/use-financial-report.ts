import { useCallback, useEffect, useRef, useState } from 'react'

import { type FinancialReportView } from '@client/modules/financial-report/application/load-financial-report-view'
import { loadFinancialReportView } from '@client/modules/financial-report/financial-report.composition'

type FinancialReportState =
	| { status: 'loading' }
	| { status: 'success'; data: FinancialReportView }
	| { status: 'error' }

export const useFinancialReport = () => {
	const [state, setState] = useState<FinancialReportState>({
		status: 'loading',
	})
	const [requestVersion, setRequestVersion] = useState(0)
	const activeControllerRef = useRef<AbortController | null>(null)
	const activeRequestIdRef = useRef(0)

	const reload = useCallback(() => {
		activeControllerRef.current?.abort()
		setState({ status: 'loading' })
		setRequestVersion((currentVersion) => currentVersion + 1)
	}, [])

	useEffect(() => {
		const controller = new AbortController()
		const requestId = activeRequestIdRef.current + 1

		activeRequestIdRef.current = requestId
		activeControllerRef.current = controller

		const loadData = async () => {
			try {
				const data = await loadFinancialReportView(controller.signal)

				if (
					controller.signal.aborted ||
					requestId !== activeRequestIdRef.current
				) {
					return
				}

				setState({ status: 'success', data })
			} catch (error) {
				if (
					controller.signal.aborted ||
					requestId !== activeRequestIdRef.current
				) {
					return
				}

				console.error('Failed to load financial report', error)
				setState({ status: 'error' })
			} finally {
				if (activeControllerRef.current === controller) {
					activeControllerRef.current = null
				}
			}
		}

		void loadData()

		return () => controller.abort()
	}, [requestVersion])

	return {
		...state,
		reload,
	}
}
