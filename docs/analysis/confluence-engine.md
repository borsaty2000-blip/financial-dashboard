# Confluence Engine — المرحلة 9

## الغرض

يجمع المحرك نتائج المدارس التحليلية في درجة توافق أدلة واحدة من 0 إلى 100. النتيجة ليست احتمال ربح ولا ضماناً ولا توصية استثمارية؛ هي قياس لاتساق الأدلة المتاحة وجودتها.

الملف التنفيذي:

`server/src/services/analysis/confluence.service.ts`

## المدارس والأوزان الأساسية

| المدرسة | الوزن |
|---|---:|
| Trend | 12 |
| Momentum | 10 |
| Volume | 8 |
| Market Structure | 10 |
| Support/Resistance | 8 |
| Fibonacci | 7 |
| Elliott Wave | 10 |
| Gann | 5 |
| Harmonic | 4 |
| Classical Patterns | 6 |
| Wyckoff | 5 |
| VSA | 4 |
| Volatility | 3 |
| Divergence | 5 |
| Market Regime | 3 |
| **الإجمالي** | **100** |

كل مدرسة تعيد:

- `score`: من 0 إلى 100 أو `null` عند عدم توفر المصدر.
- `signal`: `BUY` أو `SELL` أو `NEUTRAL` أو `UNAVAILABLE`.
- الوزن الأساسي.
- وزن النظام `regime_weight`.
- الوزن المعدل بعد الدمج.
- السبب والمصدر.

## تدفق الحساب

1. تُقرأ النتائج المتاحة من المحركات المستقلة.
2. تُشتق نتائج السعر والمؤشرات وS/R وFibonacci وMarket Regime عند توفر الحد الأدنى من الشموع.
3. لا تُعطى المدرسة غير المتاحة درجة مصطنعة؛ يظهر `score: null` وتدخل في `missing_data`.
4. يُطبّق وزن Market Regime على المدرسة المناسبة.
5. تُطبّع الأوزان المعدلة للمدارس المتاحة إلى 100.
6. تُحسب أوزان الأدلة الصاعدة والهابطة والمحايدة.
7. تُنتج الأدلة الداعمة والمتعارضة و`top_signals` و`risk_notes`.

## الإشارات والـ Verdict

- `75–100`: `STRONG_BUY`
- `60–75`: `BUY`
- `45–60`: `NEUTRAL`
- `30–45`: `SELL`
- `0–30`: `STRONG_SELL`

ويُعاد الاسم العربي لكل verdict.

## Regime Integration

يستقبل المحرك أوزان النظام من Market Regime عند توفرها. أمثلة:

- الاتجاه: يرفع Trend وMomentum ويخفض Mean Reversion.
- النطاق: يرفع Mean Reversion وOscillators ويخفض Trend.
- التقلب المرتفع: يرفع Volatility وBreakout ويخفض Mean Reversion.
- التجميع/التصريف: يرفع Wyckoff وVSA وVolume.
- الاختراق: يرفع Momentum وVolume وTrend.

إذا لم يتوفر Regime، يبقى معامل المدرسة 1.0 ولا تُختلق نتيجة.

## الأدلة والشفافية

`supporting_evidence` يحتوي المدارس ذات الدرجة الصاعدة، و`contradicting_evidence` يحتوي المدارس ذات الدرجة الهابطة. أما `missing_data` فيوضح كل مدرسة لا يمكن حسابها وسبب ذلك.

`data_quality` يتضمن:

- عدد الشموع.
- عدد المصادر المتاحة.
- عدد المصادر الناقصة.
- درجة جودة المصدر.
- التحذيرات.

## Recommendation Support

`buildDecisionSupport` يشتق من درجة Confluence:

- نوع السيناريو.
- منطقة الدخول.
- وقف الخسارة.
- ثلاثة أهداف.
- الإبطال.
- الإطار الزمني.
- مدة الاحتفاظ التقريبية.
- مستوى المخاطرة النسبي.

هذه مخرجات تحليلية مشروطة، وليست أمراً تنفيذياً أو ضماناً.

## التوافق مع Orchestrator

تم الحفاظ على exports الحالية:

- `analyzeHarmonic`
- `calculateConfluence`
- `buildDecisionSupport`

وتم تمرير رمز السهم إلى Confluence من Orchestrator دون تغيير عقد المحركات السابقة.

## الاختبارات

`server/tests/confluence.test.ts` يحتوي على **43 اختباراً** تشمل:

- المدارس الخمس عشرة.
- مجموع الأوزان الأساسي 100.
- إعادة تطبيع الأوزان المعدلة.
- حدود الدرجات والإشارات.
- Regime Weights.
- الأدلة الداعمة والمتعارضة.
- البيانات الناقصة وعدم الاختلاق.
- توافق Recommendation مع Confluence.
- مناطق الدخول ووقف الخسارة والأهداف.
