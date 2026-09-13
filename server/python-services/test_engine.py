from datetime import date, timedelta

from services.elliott_wave import analyze_elliott_wave
from services.gann import analyze_gann
from services.pivots import detect_pivots

prices = [100, 102, 105, 103, 110, 107, 118, 112, 125, 120, 130, 126, 136, 131, 142, 138, 148]
dates = [(date(2026, 1, 1) + timedelta(days=index)).isoformat() for index in range(len(prices))]
assert detect_pivots(__import__('numpy').array(prices), order=1)["peaks"]
elliott = analyze_elliott_wave(prices, order=1)
assert "pivots" in elliott and "confidence" in elliott and "targets" in elliott
gann = analyze_gann(prices, dates)
assert set(("angles", "square_of_nine", "time_cycles", "gann_fan")) <= set(gann)
try:
    analyze_elliott_wave([100, 101], order=1)
except ValueError:
    pass
else:
    raise AssertionError("short input should fail")
try:
    analyze_gann([100, 101, 102], dates[:2],)
except ValueError:
    pass
else:
    raise AssertionError("date mismatch should fail")
print({"elliott_confidence": elliott["confidence"], "pivots": len(elliott["pivots"]), "gann_cycles": len(gann["time_cycles"])})
