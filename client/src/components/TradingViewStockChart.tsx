import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  PriceScaleMode,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type IChartApi,
  type Time,
} from 'lightweight-charts'
import { api } from '../lib/api'

type Candle = { date: string; open: number; high: number; low: number; close: number; volume: number }
type Props = { candles: Candle[]; symbol: string; market: 'EGX' | 'TASI'; analysis?: { recommendation?: any; gann?: any; fibonacci?: any; elliott?: any } }
type FrameId = '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W' | '1M' | '1Y' | '5Y'
type Frame = { id: FrameId; label: string; available: boolean; interval: string; days: number }
type CandleResponse = { candles?: Candle[]; data?: { candles?: Candle[] } }
type Visibility = { sma20: boolean; sma50: boolean; sma200: boolean; ema9: boolean; bollinger: boolean; vwap: boolean; fibonacci: boolean; gannFan: boolean; elliott: boolean; tradingLevels: boolean; volume: boolean }

const FRAMES: Frame[] = [
  { id: '1m', label: '1m', available: false, interval: '1m', days: 1 }, { id: '5m', label: '5m', available: false, interval: '5m', days: 5 },
  { id: '15m', label: '15m', available: false, interval: '15m', days: 15 }, { id: '30m', label: '30m', available: false, interval: '30m', days: 30 },
  { id: '1H', label: '1H', available: false, interval: '1h', days: 90 }, { id: '4H', label: '4H', available: false, interval: '4h', days: 180 },
  { id: '1D', label: '1D', available: true, interval: '1d', days: 250 }, { id: '1W', label: '1W', available: true, interval: '1wk', days: 1825 },
  { id: '1M', label: '1M', available: true, interval: '1mo', days: 3650 }, { id: '1Y', label: '1Y', available: true, interval: '1d', days: 365 },
  { id: '5Y', label: '5Y', available: true, interval: '1d', days: 1825 },
]

const overlayKeys: Array<[keyof Visibility, string]> = [
  ['sma20', 'SMA20'], ['sma50', 'SMA50'], ['sma200', 'SMA200'], ['ema9', 'EMA9'], ['bollinger', 'Bollinger'],
  ['vwap', 'VWAP'], ['fibonacci', 'Fibonacci'], ['gannFan', 'Gann Fan'], ['elliott', 'Elliott Labels'], ['tradingLevels', 'Buy/SL/TP'],
]
const defaultVisibility: Visibility = { sma20: false, sma50: false, sma200: false, ema9: false, bollinger: false, vwap: false, fibonacci: false, gannFan: false, elliott: false, tradingLevels: false, volume: true }
const storageKey = (symbol: string, key: string) => `borsaty-chart:${symbol}:${key}`
const readStorage = (key: string, fallback: string) => typeof window === 'undefined' ? fallback : window.localStorage.getItem(key) ?? fallback
const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null

const validCandles = (items: Candle[] | undefined) => {
  if (!Array.isArray(items)) return []
  const unique = new Map<string, Candle>()
  for (const candle of items) {
    if (!candle?.date || Number.isNaN(Date.parse(candle.date))) continue
    if (![candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite)) continue
    unique.set(candle.date, { ...candle, high: Math.max(candle.open, candle.high, candle.low, candle.close), low: Math.min(candle.open, candle.high, candle.low, candle.close) })
  }
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date))
}
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const movingAverage = (values: number[], period: number) => values.map((_, index) => index + 1 < period ? NaN : average(values.slice(index - period + 1, index + 1)))
const exponentialAverage = (values: number[], period: number) => {
  const result = values.map(() => NaN)
  if (values.length < period) return result
  let previous = average(values.slice(0, period)); result[period - 1] = previous
  const multiplier = 2 / (period + 1)
  for (let index = period; index < values.length; index += 1) { previous = (values[index] - previous) * multiplier + previous; result[index] = previous }
  return result
}
const bollinger = (values: number[], period = 20, multiplier = 2) => values.map((_, index) => {
  if (index + 1 < period) return { upper: NaN, lower: NaN }
  const window = values.slice(index - period + 1, index + 1); const middle = average(window)
  const deviation = Math.sqrt(average(window.map((value) => (value - middle) ** 2)))
  return { upper: middle + multiplier * deviation, lower: middle - multiplier * deviation }
})
const vwap = (items: Candle[]) => {
  let priceVolume = 0; let volume = 0
  return items.map((candle) => { priceVolume += ((candle.high + candle.low + candle.close) / 3) * candle.volume; volume += candle.volume; return volume ? priceVolume / volume : NaN })
}
const collectNumbers = (value: unknown, keys: RegExp, output: number[] = []): number[] => {
  if (!value || typeof value !== 'object') return output
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (keys.test(key)) { const number = numeric(child); if (number != null) output.push(number); if (Array.isArray(child)) child.forEach((item) => { const n = numeric(item); if (n != null) output.push(n) }) }
    if (child && typeof child === 'object') collectNumbers(child, keys, output)
  }
  return [...new Set(output)].filter((value) => value > 0)
}
const unwrapElliott = (value: any) => {
  let data = value?.data ?? value
  if (data?.data?.by_timeframe) data = data.data
  if (data?.by_timeframe) return data
  return null
}
const waveColor = (wave: string) => {
  const label = wave.toUpperCase()
  if (['1', '3', '5'].includes(label)) return '#089981'
  if (['2', '4'].includes(label)) return '#f39c12'
  if (['A', 'B', 'C'].includes(label)) return '#2962ff'
  return '#38bdf8'
}

export default function TradingViewStockChart({ candles, symbol, market, analysis }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const defaultFrame = readStorage(storageKey(symbol, 'frame'), '1D') as FrameId
  const [frameId, setFrameId] = useState<FrameId>(FRAMES.some((frame) => frame.id === defaultFrame) ? defaultFrame : '1D')
  const [chartCandles, setChartCandles] = useState<Candle[]>(() => validCandles(candles))
  const [loading, setLoading] = useState(false)
  const [scale, setScale] = useState<'linear' | 'log'>(() => readStorage(storageKey(symbol, 'scale'), 'linear') === 'log' ? 'log' : 'linear')
  const [visibility, setVisibility] = useState<Visibility>(() => { try { return { ...defaultVisibility, ...JSON.parse(readStorage(storageKey(symbol, 'overlays'), '{}')) } } catch { return defaultVisibility } })
  const activeFrame = FRAMES.find((frame) => frame.id === frameId) ?? FRAMES[6]

  useEffect(() => { window.localStorage.setItem(storageKey(symbol, 'frame'), frameId); window.localStorage.setItem(storageKey(symbol, 'scale'), scale); window.localStorage.setItem(storageKey(symbol, 'overlays'), JSON.stringify(visibility)) }, [frameId, scale, symbol, visibility])
  useEffect(() => {
    let cancelled = false
    const loadFrame = async () => {
      if (!activeFrame.available) { setChartCandles([]); return }
      if (activeFrame.id === '1D') { setChartCandles(validCandles(candles)); return }
      setLoading(true)
      try {
        const result = await api<CandleResponse>(`/api/market/candles/${symbol}?market=${market}&days=${activeFrame.days}&interval=${activeFrame.interval}`, { suppressToast: true })
        const normalized = validCandles(result?.candles ?? result?.data?.candles ?? [])
        if (!cancelled) setChartCandles(normalized)
      } catch { if (!cancelled) setChartCandles([]) } finally { if (!cancelled) setLoading(false) }
    }
    void loadFrame(); return () => { cancelled = true }
  }, [activeFrame, candles, market, symbol])

  const safeCandles = useMemo(() => validCandles(chartCandles), [chartCandles])
  const closes = useMemo(() => safeCandles.map((candle) => candle.close), [safeCandles])
  const times = useMemo(() => safeCandles.map((candle) => candle.date as Time), [safeCandles])

  useEffect(() => {
    const container = chartContainerRef.current
    if (!container || safeCandles.length < 2) return
    const chart = createChart(container, { width: container.clientWidth, height: window.innerWidth < 640 ? 350 : window.innerWidth < 1024 ? 500 : 600, layout: { background: { type: ColorType.Solid, color: '#131722' }, textColor: '#d1d4dc', fontFamily: 'JetBrains Mono, monospace' }, grid: { vertLines: { color: '#2a2e39' }, horzLines: { color: '#2a2e39' } }, rightPriceScale: { borderColor: '#434651', mode: scale === 'log' ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal, scaleMargins: { top: 0.08, bottom: visibility.volume ? 0.24 : 0.08 } }, timeScale: { borderColor: '#434651', rightOffset: 4, timeVisible: true, secondsVisible: false }, crosshair: { vertLine: { color: '#758696', width: 1, style: 3 }, horzLine: { color: '#758696', width: 1, style: 3 } }, handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false }, handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true } })
    chartRef.current = chart
    const candleSeries = chart.addSeries(CandlestickSeries, { upColor: '#089981', downColor: '#F23645', borderUpColor: '#089981', borderDownColor: '#F23645', wickUpColor: '#089981', wickDownColor: '#F23645' })
    candleSeries.setData(safeCandles.map((candle): CandlestickData => ({ time: candle.date as Time, open: candle.open, high: candle.high, low: candle.low, close: candle.close })))
    if (visibility.volume) { const volumeSeries = chart.addSeries(HistogramSeries, { priceScaleId: 'volume', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false }); volumeSeries.setData(safeCandles.map((candle) => ({ time: candle.date as Time, value: candle.volume, color: candle.close >= candle.open ? '#08998199' : '#F2364599' }))); chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } }) }
    const addLine = (values: number[], color: string, width: 1 | 2 = 1) => { const points = values.flatMap((value, index) => Number.isFinite(value) ? [{ time: times[index], value }] : []); if (points.length > 1) chart.addSeries(LineSeries, { color, lineWidth: width }).setData(points) }
    if (visibility.sma20) addLine(movingAverage(closes, 20), '#facc15', 2)
    if (visibility.sma50) addLine(movingAverage(closes, 50), '#fb923c', 2)
    if (visibility.sma200) addLine(movingAverage(closes, 200), '#c084fc', 2)
    if (visibility.ema9) addLine(exponentialAverage(closes, 9), '#38bdf8', 2)
    if (visibility.vwap) addLine(vwap(safeCandles), '#ffffff', 2)
    if (visibility.bollinger) { const bands = bollinger(closes); addLine(bands.map((item) => item.upper), '#60a5fa'); addLine(bands.map((item) => item.lower), '#60a5fa') }
    const addPriceLine = (price: number, title: string, color: string) => { if (Number.isFinite(price)) candleSeries.createPriceLine({ price, color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title }) }
    if (visibility.fibonacci) collectNumbers(analysis?.fibonacci, /23|38|50|61|78|level|retracement|extension/i).slice(0, 8).forEach((price, index) => addPriceLine(price, `Fib ${index + 1}`, '#a78bfa'))
    if (visibility.tradingLevels) { const recommendation = analysis?.recommendation; const entry = numeric(recommendation?.entry) ?? (Array.isArray(recommendation?.entry_zone) ? numeric(recommendation.entry_zone[0]) : null); const stop = numeric(recommendation?.stop_loss); const targets: number[] = Array.isArray(recommendation?.targets) ? recommendation.targets.map((target: any): number | null => numeric(target?.price) ?? numeric(target)).filter((value: number | null): value is number => value != null) : []; if (entry != null) addPriceLine(entry, `دخول ${entry.toFixed(2)}`, '#089981'); if (stop != null) addPriceLine(stop, `وقف ${stop.toFixed(2)}`, '#F23645'); targets.slice(0, 3).forEach((target: number, index: number) => addPriceLine(target, `هدف ${index + 1}: ${target.toFixed(2)}`, '#089981')) }
    if (visibility.gannFan) { const low = Math.min(...safeCandles.map((candle) => candle.low)); const anglePrices = collectNumbers(analysis?.gann, /price|angle/i).slice(0, 9); anglePrices.forEach((price, index) => { if (times.length > 1) chart.addSeries(LineSeries, { color: index === 0 ? '#f59e0b' : '#f59e0b88', lineWidth: 1 }).setData([{ time: times[0], value: low }, { time: times.at(-1) as Time, value: price }]) }) }
    if (visibility.elliott) { const elliottData = unwrapElliott(analysis?.elliott); const waves = (elliottData?.by_timeframe?.daily?.waves ?? []) as any[]; const markers = waves.flatMap((wave) => { const index = typeof wave?.index === 'number' ? wave.index : safeCandles.findIndex((candle) => candle.date === (wave?.end_date ?? wave?.date)); const label = String(wave?.label ?? wave?.number ?? wave?.wave ?? ''); const direction = String(wave?.direction ?? '').toLowerCase(); return index >= 0 && label ? [{ time: times[index], position: direction === 'down' ? 'belowBar' as const : 'aboveBar' as const, shape: direction === 'down' ? 'arrowUp' as const : 'arrowDown' as const, color: waveColor(label), text: label, size: 2 }] : [] }); if (markers.length) createSeriesMarkers(candleSeries, markers) }
    chart.timeScale().fitContent()
    const observer = new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth })); observer.observe(container)
    return () => { observer.disconnect(); chart.remove(); chartRef.current = null }
  }, [analysis, closes, safeCandles, scale, times, visibility])

  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === '+' || event.key === '=') chartRef.current?.timeScale().scrollToRealTime(); if (event.key === '-') chartRef.current?.timeScale().fitContent() }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown) }, [])
  const chooseFrame = (frame: Frame) => { setFrameId(frame.id) }
  const toggle = (key: keyof Visibility) => setVisibility((current) => ({ ...current, [key]: !current[key] }))

  return <div className="tradingview-stock-chart">
    <div className="chart-frame-toolbar" role="group" aria-label="الفريم الزمني">{FRAMES.map((frame) => <button key={frame.id} type="button" className={frame.id === frameId ? 'is-active' : ''} onClick={() => chooseFrame(frame)} aria-pressed={frame.id === frameId}>{frame.label}</button>)}</div>
    <div className="chart-overlay-toolbar" role="group" aria-label="مؤشرات ومستويات الشارت">{overlayKeys.map(([key, label]) => <button key={key} type="button" className={visibility[key] ? 'is-active' : ''} onClick={() => toggle(key)} aria-pressed={visibility[key]}>{label}</button>)}</div>
    <div className="chart-tool-toolbar" role="group" aria-label="أدوات الشارت"><button type="button" onClick={() => chartRef.current?.timeScale().fitContent()}>ملاءمة</button><button type="button" onClick={() => chartRef.current?.timeScale().scrollToRealTime()}>آخر شمعة</button><button type="button" className={scale === 'log' ? 'is-active' : ''} onClick={() => setScale((value) => value === 'log' ? 'linear' : 'log')}>{scale === 'log' ? 'لوغاريتمي' : 'خطي'}</button><button type="button" className={visibility.volume ? 'is-active' : ''} onClick={() => toggle('volume')}>الحجم</button><span className="chart-shortcut-hint">+ / − للتكبير والملاءمة</span></div>
    {loading && <div className="chart-frame-status">جاري تحميل بيانات {activeFrame.label}...</div>}
    <div ref={chartContainerRef} className={`tradingview-chart-canvas ${safeCandles.length < 2 ? 'is-empty' : ''}`} aria-label="رسم الشموع السعري" />
  </div>
}
