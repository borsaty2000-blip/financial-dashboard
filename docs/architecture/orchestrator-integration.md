# Orchestrator Integration — Phase 11

## المخطط الكامل

```text
CandlesService (500 daily bars)
        │
        ▼
QualityGuardian
  ├─ duplicate/date/OHLC checks
  ├─ minimum 30 valid bars
  └─ source + data_quality provenance
        │
        ▼
Promise.allSettled + safeEngine
  ├─ Elliott MTF       12s
  ├─ Gann              12s
  ├─ Harmonic          12s
  ├─ Wyckoff             8s
  ├─ VSA                 8s
  ├─ Classical Patterns  8s
  ├─ Support/Resistance  8s
  ├─ Fibonacci           8s
  ├─ Indicators          8s
  ├─ Multi-Timeframe      8s
  ├─ Market Regime        8s
  └─ Backtesting         20s
        │
        ├─ Divergence adapter from MTF
        ├─ Confluence from available evidence
        └─ Recommendation from confluence score
        ▼
CompleteAnalysis + integrity + top_signals
```

## تدفق البيانات

1. يطبع الرمز والسوق ويبحث في cache بمفتاح `market:symbol`.
2. يجلب 500 شمعة يومية عبر `CandlesService`.
3. ينظف السلسلة بواسطة `QualityGuardian`؛ لا تُختلق شموع عند النقص.
4. يشغّل المحركات بالتوازي عبر `Promise.allSettled`.
5. يحوّل كل نتيجة إلى `EngineResult` موحد يحتوي `available`, `data`, `source`, `latency_ms`, `error`, و`data_quality`.
6. يشغّل Confluence وRecommendation بعد توفر نتائج المحركات الأساسية.
7. يحسب `top_signals` من النتائج القابلة للاستخراج ويرتبها حسب الثقة.
8. يخزن العقد الكامل خمس دقائق ويعيد `cache_hit` في الطلب التالي.

## Cache strategy

- TTL: `300000ms`.
- القيمة المخزنة هي `CompleteAnalysis` كاملة، وليست أجزاء من النتائج.
- `AnalysisOrchestrator.clearCache(symbol, market)` لمسح عنصر واحد.
- `AnalysisOrchestrator.clearCache()` لمسح كامل cache.
- لا تُستخدم cache لتجاوز QualityGuardian؛ كل نتيجة مخزنة سبق أن اجتازت التحقق.

## Timeouts والعزل

`safeEngine` يستخدم `Promise.race` مع مؤقت مستقل داخل `Promise.allSettled`. عند فشل أو انتهاء مهلة محرك واحد، يعيد المحرك `available: false` مع الخطأ، بينما تستمر بقية المحركات. لا يتم تسريب تفاصيل مفاتيح أو اتصالات المصادر إلى واجهة المستخدم.

## Integrity Score

```text
score = round(engines_ok / 15 × 100)
```

المحرك لا يُعد ناجحاً إلا إذا أنتج بيانات متاحة. النتيجة `80` تعني نجاح 12 من أصل 15 محركاً على الأقل؛ أما التحذيرات وأخطاء المحركات فتظل في `integrity.warnings` و`integrity.issues` للمراقبة.

## المسارات

- `GET /api/stock/:symbol/full?market=EGX|TASI`: التقرير الكامل.
- `GET /api/stock/:symbol/debug?market=EGX|TASI`: حالة المحركات وزمنها وأخطاؤها دون أجسام البيانات.
- `GET /api/health/analysis`: فحص الرموز الأساسية ومتوسط السلامة.

## الاختبارات

`server/tests/orchestrator-integration.test.ts` يحتوي 28 اختباراً تشمل COMI وABUK، اختلاف السلاسل، سلامة 15 محركاً، cache، timeouts، الفشل المعزول، الترتيب، data quality، البيانات الناقصة، وعقد debug.

النتائج التاريخية والكمية ليست ضماناً للأداء المستقبلي أو توصية استثمارية.
