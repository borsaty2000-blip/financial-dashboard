#!/usr/bin/env bash
set -u -o pipefail

BASE_URL="${BASE_URL:-https://borsatyai.com}"
REPORT="${REPORT:-docs/qa/analysis-coverage-baseline.md}"
TIMEOUT="${TIMEOUT:-45}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$(dirname "$REPORT")"

symbols=(COMI ABUK EAST 2222 BTCUSDT)
declare -A markets=(
  [COMI]=EGX
  [ABUK]=EGX
  [EAST]=EGX
  [2222]=TASI
  [BTCUSDT]=CRYPTO
)
endpoints=(
  "elliott-mtf"
  "gann"
  "harmonic"
  "confluence"
  "recommendation"
  "matrix"
  "stock-full"
)

now_utc() { date -u '+%Y-%m-%d %H:%M:%S UTC'; }

cat > "$REPORT" <<EOF
# Analysis Coverage Baseline

- Generated: $(now_utc)
- Base URL: $BASE_URL
- Scope: 7 analysis endpoints × 5 symbols = 35 HTTP probes
- This report records observed production responses; it does not fabricate unavailable data.

## HTTP Coverage

| Endpoint | Symbol | Market | HTTP | Elapsed (ms) | Response fields | Error |
|---|---|---:|---:|---:|---|---|
EOF

for endpoint in "${endpoints[@]}"; do
  for symbol in "${symbols[@]}"; do
    market="${markets[$symbol]}"
    case "$endpoint" in
      stock-full) path="/api/stock/${symbol}/full?market=${market}" ;;
      *) path="/api/analysis/${symbol}/${endpoint}?market=${market}" ;;
    esac

    body="$TMP_DIR/body"
    headers="$TMP_DIR/headers"
    started="$(date +%s%3N)"
    http_code="$(curl -sS --max-time "$TIMEOUT" -D "$headers" -o "$body" -w '%{http_code}' "$BASE_URL$path" 2>"$TMP_DIR/curl-error")" || http_code="000"
    finished="$(date +%s%3N)"
    elapsed=$((finished - started))

    if jq -e . "$body" >/dev/null 2>&1; then
      fields="$(jq -r 'if type == "object" then (keys | join(", ")) else (type) end' "$body" | tr '\n' ' ' | cut -c1-220)"
      error="$(jq -r 'if type == "object" then (.error // .message // .status // "") else "" end' "$body" | tr '\n' ' ' | cut -c1-180)"
      [ "$error" = "null" ] && error=""
    else
      fields="non-json response"
      error="$(tr '\n' ' ' < "$TMP_DIR/curl-error" | cut -c1-180)"
      [ -z "$error" ] && error="$(head -c 180 "$body" | tr '\n' ' ')"
    fi

    printf '| `%s` | `%s` | `%s` | `%s` | %s | `%s` | %s |\n' \
      "$endpoint" "$symbol" "$market" "$http_code" "$elapsed" "$fields" "${error:-—}" >> "$REPORT"
  done
done

cat >> "$REPORT" <<EOF

## Local Verification

The following commands were run after the HTTP probes:

| Command | Result | Detail |
|---|---|---|
EOF

run_check() {
  local label="$1"
  shift
  local safe_label
  safe_label="$(printf '%s' "$label" | tr ' /' '__')"
  local log="$TMP_DIR/${safe_label}.log"
  if "$@" >"$log" 2>&1; then
    printf '| `%s` | PASS | %s |\n' "$label" "$(tail -n 1 "$log" | tr '\n' ' ' | cut -c1-180)" >> "$REPORT"
  else
    printf '| `%s` | FAIL | %s |\n' "$label" "$(tail -n 8 "$log" | tr '\n' ' ' | cut -c1-400)" >> "$REPORT"
  fi
}

run_check 'npm run typecheck' npm run typecheck
run_check 'npm run test:server' npm run test:server
run_check 'python pytest tests/ -v' bash -lc 'cd server/python-services && .venv/bin/pytest tests/ -v'

cat >> "$REPORT" <<EOF

## Notes

- HTTP status and response fields are observations from the configured base URL.
- A non-2xx response is recorded as an error; no synthetic values are inserted.
- Timing is measured client-side around each curl request.
EOF

printf 'Report written to %s\n' "$REPORT"
