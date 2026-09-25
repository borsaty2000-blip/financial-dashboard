import { useCallback, useEffect, useState } from 'react'

const API = 'https://borsatyai.com'

type EngineEnvelope = {
  available?: boolean
  data?: unknown
  source?: string
  error?: string | null
  reason?: string
  latency_ms?: number
}

export interface StockAnalysis {
  status?: string
  symbol: string
  market: string
  fetched_at: string
  candles: { count: number; source: string; available: boolean; data_quality?: unknown }
  elliott: { available: boolean; data: any; source: string; error: string | null }
  gann: { available: boolean; data: any; source: string; error: string | null }
  harmonic: { available: boolean; data: any; source: string; error: string | null }
  confluence: { available: boolean; data: any; source: string; error: string | null }
  recommendation: { available: boolean; data: any; source: string; error: string | null }
  integrity: { score: number; engines_ok: number; engines_total: number; warnings: string[] }
}

function unwrap(value: unknown): any {
  const envelope = (value ?? {}) as EngineEnvelope
  const first = envelope.data
  if (first && typeof first === 'object' && 'data' in first) {
    return (first as { data?: unknown }).data ?? first
  }
  return first ?? null
}

function normalizeEngine(value: unknown) {
  const envelope = (value ?? {}) as EngineEnvelope
  const nested = envelope.data as { source?: string } | undefined
  return {
    available: envelope.available === true,
    data: unwrap(value),
    source: envelope.source ?? nested?.source ?? 'borsatyai',
    error: envelope.error ?? (envelope.available === false ? envelope.reason ?? null : null),
  }
}

function normalizeResponse(json: any, symbol: string, market: string): StockAnalysis {
  const candles = json.candles ?? {}
  const integrity = json.integrity ?? {}
  return {
    ...json,
    symbol: json.symbol ?? symbol,
    market: json.market ?? market,
    fetched_at: json.fetched_at ?? new Date().toISOString(),
    candles: {
      count: Number(candles.count ?? 0),
      source: candles.source ?? 'borsatyai',
      available: Number(candles.count ?? 0) > 0,
      data_quality: candles.data_quality,
    },
    elliott: normalizeEngine(json.elliott),
    gann: normalizeEngine(json.gann),
    harmonic: normalizeEngine(json.harmonic),
    confluence: normalizeEngine(json.confluence),
    recommendation: normalizeEngine(json.recommendation),
    integrity: {
      score: Number(integrity.score ?? 0),
      engines_ok: Number(integrity.available_engines ?? integrity.engines_ok ?? 0),
      engines_total: Number(integrity.total_engines ?? integrity.engines_total ?? 6),
      warnings: Array.isArray(integrity.issues) ? integrity.issues : [],
    },
  }
}

export function useStockAnalysis(symbol: string, market = 'EGX', refreshMs = 60000) {
  const [data, setData] = useState<StockAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function fetchAnalysis() {
      try {
        const response = await fetch(
          `${API}/api/stock/${encodeURIComponent(symbol)}/full?market=${encodeURIComponent(market)}`,
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const json = await response.json()
        if (!cancelled) {
          setData(normalizeResponse(json, symbol, market))
          setError(null)
        }
      } catch (cause) {
        if (!cancelled && (cause as Error).name !== 'AbortError')
          setError(cause instanceof Error ? cause.message : 'تعذر تحميل التحليل')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchAnalysis()
    const timer = window.setInterval(() => void fetchAnalysis(), refreshMs)
    return () => {
      cancelled = true
      controller.abort()
      window.clearInterval(timer)
    }
  }, [market, refreshKey, symbol, refreshMs])

  return { data, loading, error, refresh }
}

export default useStockAnalysis
