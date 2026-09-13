import json
import os
import sys

source_dir = os.environ.get('EGX_SOURCE_DIR')
if not source_dir:
    raise SystemExit('EGX_SOURCE_DIR is required and must point to the official EGX repository')
sys.path.insert(0, source_dir)

from tools import getStockDataEGX, getStockPriceEGX  # noqa: E402
from precious_metals import get_gold_price, get_silver_price  # noqa: E402


def main() -> None:
    request = json.loads(sys.stdin.read())
    tool = request.get('tool')
    if tool == 'stock_price_egx':
        value = getStockPriceEGX(request['symbol'])
    elif tool == 'stock_data_egx':
        value = getStockDataEGX(request['symbol'])
    elif tool == 'gold_price':
        value = get_gold_price()
    elif tool == 'silver_price':
        value = get_silver_price()
    else:
        raise ValueError(f'Unsupported official EGX tool: {tool}')
    print(json.dumps({'ok': True, 'data': value}, default=str))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'ok': False, 'error': str(exc)}))
        raise
