# Analysis Coverage Baseline

- Generated: 2026-09-27 19:15:48 UTC
- Base URL: https://borsatyai.com
- Scope: 7 analysis endpoints × 5 symbols = 35 HTTP probes
- This report records observed production responses; it does not fabricate unavailable data.

## HTTP Coverage

| Endpoint | Symbol | Market | HTTP | Elapsed (ms) | Response fields | Error |
|---|---|---:|---:|---:|---|---|
| `elliott-mtf` | `COMI` | `EGX` | `200` | 4630 | `candles_count, data, data_source, decision, engine_mode, market, source, status, symbol ` | success  |
| `elliott-mtf` | `ABUK` | `EGX` | `200` | 3163 | `candles_count, data, data_source, decision, engine_mode, market, source, status, symbol ` | success  |
| `elliott-mtf` | `EAST` | `EGX` | `200` | 3480 | `candles_count, data, data_source, decision, engine_mode, market, source, status, symbol ` | success  |
| `elliott-mtf` | `2222` | `TASI` | `200` | 2324 | `candles_count, data, data_source, decision, engine_mode, market, source, status, symbol ` | success  |
| `elliott-mtf` | `BTCUSDT` | `CRYPTO` | `404` | 3294 | `message, status ` | يلزم توفر 60 شمعة على الأقل لبناء تحليل متعدد الأطر  |
| `gann` | `COMI` | `EGX` | `200` | 2327 | `candles_count, data, engine_mode, source, status ` | success  |
| `gann` | `ABUK` | `EGX` | `200` | 2370 | `candles_count, data, engine_mode, source, status ` | success  |
| `gann` | `EAST` | `EGX` | `200` | 2367 | `candles_count, data, engine_mode, source, status ` | success  |
| `gann` | `2222` | `TASI` | `200` | 2042 | `candles_count, data, engine_mode, source, status ` | success  |
| `gann` | `BTCUSDT` | `CRYPTO` | `404` | 2942 | `message, status ` | لا توجد بيانات تاريخية متطابقة لهذا السهم  |
| `harmonic` | `COMI` | `EGX` | `200` | 2275 | `candles_count, data, data_quality, source, status ` | insufficient_data  |
| `harmonic` | `ABUK` | `EGX` | `200` | 2208 | `candles_count, data, data_quality, source, status ` | insufficient_data  |
| `harmonic` | `EAST` | `EGX` | `200` | 2062 | `candles_count, data, data_quality, source, status ` | insufficient_data  |
| `harmonic` | `2222` | `TASI` | `200` | 2088 | `candles_count, data, data_quality, source, status ` | insufficient_data  |
| `harmonic` | `BTCUSDT` | `CRYPTO` | `200` | 2933 | `candles_count, data, data_quality, source, status ` | insufficient_data  |
| `confluence` | `COMI` | `EGX` | `200` | 2647 | `candles_count, data, data_quality, source, status ` | success  |
| `confluence` | `ABUK` | `EGX` | `200` | 2545 | `candles_count, data, data_quality, source, status ` | success  |
| `confluence` | `EAST` | `EGX` | `200` | 2398 | `candles_count, data, data_quality, source, status ` | success  |
| `confluence` | `2222` | `TASI` | `200` | 2045 | `candles_count, data, data_quality, source, status ` | success  |
| `confluence` | `BTCUSDT` | `CRYPTO` | `200` | 3078 | `candles_count, data, data_quality, source, status ` | insufficient_data  |
| `recommendation` | `COMI` | `EGX` | `200` | 2630 | `candles_count, data, data_quality, source, status ` | success  |
| `recommendation` | `ABUK` | `EGX` | `200` | 2416 | `candles_count, data, data_quality, source, status ` | success  |
| `recommendation` | `EAST` | `EGX` | `200` | 2370 | `candles_count, data, data_quality, source, status ` | success  |
| `recommendation` | `2222` | `TASI` | `200` | 2119 | `candles_count, data, data_quality, source, status ` | success  |
| `recommendation` | `BTCUSDT` | `CRYPTO` | `200` | 3426 | `candles_count, data, data_quality, source, status ` | insufficient_data  |
| `matrix` | `COMI` | `EGX` | `200` | 3084 | `alignment, alignment_score, consensus, disclaimer, market, matrix, symbol ` |   |
| `matrix` | `ABUK` | `EGX` | `200` | 3472 | `alignment, alignment_score, consensus, disclaimer, market, matrix, symbol ` |   |
| `matrix` | `EAST` | `EGX` | `200` | 3350 | `alignment, alignment_score, consensus, disclaimer, market, matrix, symbol ` |   |
| `matrix` | `2222` | `TASI` | `200` | 2368 | `alignment, alignment_score, consensus, disclaimer, market, matrix, symbol ` |   |
| `matrix` | `BTCUSDT` | `CRYPTO` | `200` | 3307 | `alignment, alignment_score, consensus, disclaimer, market, matrix, symbol ` |   |
| `stock-full` | `COMI` | `EGX` | `200` | 2059 | `candles, confluence, elliott, gann, harmonic, integrity, latency_ms, market, price, recommendation, status, symbol ` | success  |
| `stock-full` | `ABUK` | `EGX` | `200` | 2585 | `candles, confluence, elliott, gann, harmonic, integrity, latency_ms, market, price, recommendation, status, symbol ` | success  |
| `stock-full` | `EAST` | `EGX` | `200` | 2080 | `candles, confluence, elliott, gann, harmonic, integrity, latency_ms, market, price, recommendation, status, symbol ` | success  |
| `stock-full` | `2222` | `TASI` | `200` | 2048 | `candles, confluence, elliott, gann, harmonic, integrity, latency_ms, market, price, recommendation, status, symbol ` | success  |
| `stock-full` | `BTCUSDT` | `CRYPTO` | `404` | 3406 | `candles, integrity, market, status, symbol ` | unavailable  |

## Local Verification

The following commands were run after the HTTP probes:

| Command | Result | Detail |
|---|---|---|
| `npm run typecheck` | PASS |   |
| `npm run test:server` | PASS | # duration_ms 9488.71456  |
| `python pytest tests/ -v` | PASS | ============================== 9 passed in 2.17s ===============================  |

## Notes

- HTTP status and response fields are observations from the configured base URL.
- A non-2xx response is recorded as an error; no synthetic values are inserted.
- Timing is measured client-side around each curl request.
