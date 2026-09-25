#!/usr/bin/env bash
set -u
set -o pipefail

BASE_URL="${BASE_URL:-https://borsatyai.com/api}"
OUTPUT="${1:-docs/qa/stability-baseline.md}"
mkdir -p "$(dirname "$OUTPUT")"

{
  echo "# BorsatyAI Stability Baseline"
  echo
  echo "- Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- Base URL: ${BASE_URL}"
  echo "- Scope: 10 EGX symbols × 6 data/analysis endpoints"
  echo
  echo "> This baseline is read-only. HTTP failures are recorded as observed; no synthetic values are introduced."
  echo
  echo "| Symbol | Endpoint | HTTP | Time (s) | Bytes | Result |"
  echo "|---|---|---:|---:|---:|---|"
} > "$OUTPUT"

symbols=(COMI ABUK EAST MFPC SWDY HRHO TMGH EKHO FWRY EFIH)
endpoints=(
  "market/quote/%s?market=EGX"
  "market/candles/%s?market=EGX&days=250"
  "analysis/%s/elliott-mtf?market=EGX"
  "analysis/%s/gann?market=EGX"
  "analysis/%s/confluence?market=EGX"
  "analysis/%s/harmonic?market=EGX"
)

for symbol in "${symbols[@]}"; do
  for pattern in "${endpoints[@]}"; do
    endpoint=$(printf "$pattern" "$symbol")
    body=$(mktemp)
    meta=$(curl -sS --max-time 90 -o "$body" -w '%{http_code} %{time_total} %{size_download}' "${BASE_URL}/${endpoint}" 2>/dev/null || printf '000 90.000 0')
    read -r status time bytes <<< "$meta"
    if [[ "$status" == "200" ]]; then result="ok"; else result="blocked_or_failed"; fi
    printf '| `%s` | `%s` | `%s` | `%s` | `%s` | %s |\n' "$symbol" "$endpoint" "$status" "$time" "$bytes" "$result" >> "$OUTPUT"
    rm -f "$body"
  done
done

{
  echo
  echo "## Summary"
  echo
  awk -F'|' 'NR>=11 && $0 ~ /^\|/ {gsub(/[ `]/,"",$4); if ($4==200) ok++; else failed++} END {printf "- HTTP 200 rows: %d\n- Non-200/blocked rows: %d\n", ok, failed}' "$OUTPUT"
} >> "$OUTPUT"

cat "$OUTPUT"
