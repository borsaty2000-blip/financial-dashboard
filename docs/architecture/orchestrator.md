# Analysis Orchestrator

## الغرض
يوحّد `AnalysisOrchestrator` جلب الشموع، حمايتها، تشغيل المحركات، احتساب التوافق، وبناء مخرجات القرار في عقد واحد.

## دورة التنفيذ
1. تطبيع الرمز وبناء مفتاح `market:symbol`.
2. جلب 250 شمعة يومية عبر `CandlesService`.
3. تمرير الشموع إلى `QualityGuardian` بحد أدنى 30 شمعة.
4. حذف التكرارات والقيم غير الصالحة ونطاقات OHLC غير المنطقية دون اختلاق بيانات.
5. تشغيل Elliott وGann وHarmonic وIndicators بالتوازي بمهلات مستقلة.
6. بناء Confluence وRecommendation من الأدلة المتاحة.
7. تخزين النتيجة لمدة خمس دقائق لكل سوق ورمز.

## عقد النتيجة
كل محرك يعيد `available`, `data`, `latency_ms`، و`reason` عند عدم التوفر. ويشمل العقد `candles`, `integrity`, `latency_ms`, و`cache_hit`.

## Integrity Score
تُحسب الدرجة من ست طبقات: Elliott وGann وHarmonic وIndicators وConfluence وRecommendation.

```text
integrity = round(available_engines / 6 * 100)
```

أقل من 30 شمعة صالحة يوقف التحليل ويعيد درجة 0. توفر الطبقات الست يعيد 100. الدرجة ليست احتمال ربح ولا توصية استثمارية.

## المسارات
- `GET /api/stock/:symbol/full?market=EGX|TASI`: يعيد نتائج Orchestrator الكاملة، أو `unavailable` عند عدم كفاية الشموع.
- `GET /api/health/analysis`: يفحص COMI وABUK وEAST وHRHO وTMGH ويعرض السلامة والزمن وتوفر المحركات والمشكلات.

الحالة العامة في لوحة الصحة: `healthy` من 80 فأعلى، `degraded` من 60 إلى 79، و`unhealthy` دون 60.

## الاختبارات
يغطي `server/orchestrator.contract.test.ts` جودة الشموع، التكرارات، القيم غير الصالحة، البيانات القديمة، وحدود التوافق. تغطي اختبارات الخادم مسارات الصحة والتحليل، وتغطي اختبارات Python المحركات الحسابية.

## العرض العام
تظل الإفصاحات القانونية للمستخدم النهائي. أما تفاصيل المهلات والأخطاء الداخلية فتظهر في السجلات وحقول التشخيص، لا كعبارات تقنية في الواجهة.

## الملفات المرجعية
- `server/src/services/analysis/orchestrator.ts`
- `server/src/services/market/quality-guardian.ts`
- `server/src/routes/stock.routes.ts`
- `server/src/routes/analysis-health.routes.ts`
- `server/orchestrator.contract.test.ts`
- `docs/qa/stability-baseline.md`

## آخر تحقق
اختبار محلي لـ COMI وABUK أعاد HTTP 200 ودرجة سلامة 100 وتوفر المحركات الستة. وأعاد Health Dashboard حالة `healthy`. baseline: 59 استجابة HTTP 200 من أصل 60 طلباً، مع حالة واحدة غير 200 موثقة في QA.

[سجل baseline](../qa/stability-baseline.md)
[خطة القبول](../qa/acceptance-runbook.md)
[سجل التعديلات](../qa/implementation-log.md)
[تقرير الجاهزية](../qa/production-readiness-report.md)
[تقرير المصادقة](../qa/validation-report.md)
[تقرير التدقيق](../qa/final-audit-report.md)
[تقرير الإصدار](../qa/release-report.md)
[تقرير التحقق](../qa/final-verification-report.md)
[تقرير الجودة](../qa/final-quality-report.md)
[تقرير السلامة](../qa/final-integrity-report.md)
[تقرير الأداء](../qa/performance-report.md)
[تقرير التشغيل](../qa/operations-report.md)
[تقرير المراقبة](../qa/monitoring-report.md)
[تقرير الصحة](../qa/health-report.md)
[تقرير العقد](../qa/contract-review-report.md)
[تقرير Orchestrator](../qa/orchestrator-results-report.md)
[تقرير المحركات](../qa/engine-verification-report.md)
[تقرير البيانات](../qa/data-integrity-report.md)
[تقرير الإطلاق](../qa/launch-report.md)
[تقرير التسليم](../qa/final-handoff-report.md)
[تقرير الإغلاق](../qa/closure-report.md)
