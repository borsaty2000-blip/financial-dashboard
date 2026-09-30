# Analysis Orchestrator

## الغرض

يوحّد `AnalysisOrchestrator` دورة تحليل السهم في عقد واحد: جلب الشموع، تنظيفها عبر `QualityGuardian`، تشغيل محركات التحليل المستقلة، تطبيع النتائج، ثم حساب سلامة التنفيذ وإشارات مختصرة للواجهة.

## المحركات المتكاملة

يستخدم العقد خمسة عشر محركاً:

1. Elliott MTF
2. Gann
3. Harmonic
4. Wyckoff
5. VSA
6. Classical Patterns
7. Support / Resistance
8. Fibonacci
9. Complete Indicators
10. Multi-Timeframe Matrix
11. Market Regime
12. Divergence
13. Confluence
14. Recommendation
15. Backtesting

لا يستبدل الـ Orchestrator خوارزميات المحركات؛ يمرر لها شموعاً موحّدة ويعزل فشل أي محرك عن بقية النتائج.

## دورة التنفيذ

```text
CandlesService → QualityGuardian → Promise.allSettled(12 engines)
                                  → Divergence adapter
                                  → Confluence
                                  → Recommendation
                                  → normalized CompleteAnalysis
```

- كل محرك يعمل داخل `safeEngine` بمهلة مستقلة.
- محركات Python لها مهلة 12 ثانية.
- المحركات الحسابية لها مهلة 8 ثوانٍ.
- Backtesting له مهلة 20 ثانية.
- فشل أو انتهاء مهلة محرك ينتج `available: false` و`error` و`data_quality.status: unavailable`، ولا يمنع تسليم بقية العقد.

## جودة البيانات

قبل التحليل، يمر المصدر عبر `QualityGuardian`:

- إزالة التواريخ المكررة دون اختلاق شموع.
- رفض نطاق OHLC غير الصحيح.
- ترتيب السلسلة زمنياً.
- فرض حد أدنى قدره 30 شمعة.
- الاحتفاظ بـ `source` و`data_quality` والتحذيرات في العقد النهائي.

لا تُنشأ أسعار أو شموع بديلة عند نقص البيانات. إذا لم تتوافر سلسلة صالحة، يعيد Orchestrator عقداً منظماً لكل المحركات مع `integrity.score = 0`.

## Integrity Score

```text
score = round(engines_ok / engines_total × 100)
```

في الإصدار الحالي `engines_total = 15`. المحرك يُحتسب ناجحاً فقط عندما تكون نتيجته متاحة فعلياً؛ أما النتيجة الفارغة أو التي انتهت مهلتها فتظهر في `warnings/issues` ولا تُحتسب.

## Cache

- المفتاح: `MARKET:SYMBOL`.
- مدة التخزين: **5 دقائق** (`300000ms`).
- الطلب الثاني خلال المدة يعيد النتيجة نفسها مع `cache_hit: true` و`execution_time_ms: 0`.
- `AnalysisOrchestrator.clearCache(symbol, market)` لمسح رمز محدد، و`clearCache()` لمسح الكل.

## المسارات

### التقرير الكامل

`GET /api/stock/:symbol/full?market=EGX`

يعيد السعر، الشموع، سلامة البيانات، نتائج المحركات الخمسة عشر، إشارات `top_signals`، زمن التنفيذ، والتحذيرات.

### تشخيص خفيف

`GET /api/stock/:symbol/debug?market=EGX`

يعيد حالة كل محرك وزمنه وخطأه دون إعادة أجسام البيانات الكبيرة، ويصلح للمراقبة الآلية.

### لوحة الصحة

`GET /api/health/analysis`

تفحص الرموز الأساسية وتعيد `avg_integrity` وحالة كل محرك لكل رمز. الحالة `healthy` تعني متوسط سلامة لا يقل عن 80.

## الاختبارات

يغطي `server/tests/orchestrator-integration.test.ts` 28 حالة تشمل:

- عدد المحركات وتفرّد أسمائها.
- عزل الفشل والمهلات.
- عقد COMI وABUK واختلاف المدخلات.
- cache لمدة خمس دقائق ومسح cache.
- جودة المصدر وحالة كل محرك.
- اكتمال عقد debug.
- التعامل مع أقل من 30 شمعة.

هذه النتائج كمية مبنية على البيانات المتاحة وليست ضماناً للأداء المستقبلي أو توصية استثمارية.
