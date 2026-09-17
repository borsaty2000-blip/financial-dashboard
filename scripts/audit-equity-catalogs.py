import json
from pathlib import Path
from collections import Counter

root = Path('/home/ubuntu/financial-dashboard')
for market, filename in [('EGX', 'egx-companies.json'), ('TASI', 'tasi-companies.json')]:
    payload = json.loads((root / 'prisma/data' / filename).read_text())
    rows = payload.get('items', payload) if isinstance(payload, dict) else payload
    def val(row, *keys):
        for key in keys:
            if row.get(key) not in (None, ''):
                return str(row[key]).strip()
        return ''
    symbols = [val(row, 'symbol', 'shortSymbol', 'ticker') for row in rows]
    source_codes = [val(row, 'sourceCode', 'isin', 'code') for row in rows]
    names = [val(row, 'nameAr', 'name', 'arabicName') for row in rows]
    print(f'[{market}] rows={len(rows)} unique_symbols={len(set(symbols))} unique_source_codes={len(set(source_codes))}')
    print('blank_symbol=', sum(not x for x in symbols), 'blank_source_code=', sum(not x for x in source_codes), 'blank_name=', sum(not x for x in names))
    print('duplicate_symbols=', {k:v for k,v in Counter(symbols).items() if k and v > 1})
    print('duplicate_source_codes=', {k:v for k,v in Counter(source_codes).items() if k and v > 1})
    print('sample=', rows[:3])

# Cross-market collision is allowed only when market differs, but report it.
egx_payload = json.loads((root / 'prisma/data/egx-companies.json').read_text())
tasi_payload = json.loads((root / 'prisma/data/tasi-companies.json').read_text())
egx = egx_payload.get('items', egx_payload)
tasi = tasi_payload.get('items', tasi_payload)
def symbol(row): return str(row.get('symbol','')).strip().upper()
print('[CROSS_MARKET] symbol_collisions=', sorted(set(map(symbol, egx)) & set(map(symbol, tasi))))
