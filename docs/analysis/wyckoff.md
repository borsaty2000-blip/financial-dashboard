# Wyckoff Method Engine — المرحلة 2

## النطاق

المحرك المستقل موجود في:

`server/src/services/analysis/wyckoff.service.ts`

لا يتم استدعاؤه من `AnalysisOrchestrator` أو من أي endpoint في هذه المرحلة. الهدف هو اختبار منطق الكشف قبل الدمج التشغيلي.

## المراحل الأربع

| المرحلة | الوصف التشغيلي |
|---|---|
| `accumulation` | نطاق تداول يأتي بعد ضعف/هبوط، وتدعمه دلائل SC وAR وST أو Spring مع Test. |
| `markup` | توسع صاعد بعد النطاق مع إغلاق أعلى من مقاومة النطاق وحركة سعرية موجبة. |
| `distribution` | نطاق بعد صعود، مع UT وعودة أسفل الحد العلوي ويفضل LPSY أو ST. |
| `markdown` | توسع هابط مع إغلاق أسفل نطاق التداول وحركة سعرية سالبة. |

المحرك لا يفرض مرحلة عند نقص البيانات؛ يعيد `null` قبل الحد الأدنى البالغ 30 شمعة.

## الأحداث العشرة

- **PS — Preliminary Support:** ضغط هابط قرب الحد السفلي مع حجم أعلى من المتوسط.
- **SC — Selling Climax:** قاع محلي قرب الحد السفلي مع حجم مرتفع جداً.
- **AR — Automatic Rally:** ارتداد محلي بعد SC إلى جزء علوي من النطاق.
- **ST — Secondary Test:** إعادة اختبار قرب الحد السفلي بحجم منخفض نسبياً.
- **Spring:** كسر أسفل الحد السفلي ثم عودة فوقه خلال نافذة لا تتجاوز ثلاثة أيام.
- **Test:** إعادة اختبار بعد Spring بحجم أقل من حجم Spring.
- **SOS — Sign of Strength:** إغلاق فوق الحد العلوي مع حجم مرتفع.
- **LPS — Last Point of Support:** دعم بعد Spring/SOS مع تحسن السعر.
- **UT — Upthrust:** كسر أعلى الحد العلوي ثم عودة تحته خلال نافذة لا تتجاوز ثلاثة أيام.
- **LPSY — Last Point of Supply:** فشل لاحق أسفل قمة UT بحجم أقل.

## النطاق السعري

لمنع اختراق واحد من تشويه النطاق، يستخدم المحرك حدوداً trimmed تقريبية:

- `range.high`: الكمية التسعينية للقمم داخل نافذة النطاق.
- `range.low`: الكمية العشرية للقيعان داخل نافذة النطاق.
- `duration_days`: عدد الشموع في النافذة.

مقدار كسر الاختراق يعتمد على عرض النطاق:

```text
break_buffer = 1.5% × (range.high − range.low)
low_break = range.low − break_buffer
high_break = range.high + break_buffer
```

وتستخدم الأحداث نوافذ تأكيد قصيرة، مع مقارنة الحجم بمتوسط حجم النافذة:

```text
very_high: volume / averageVolume >= 2.0
high:      volume / averageVolume >= 1.35
low:       volume / averageVolume <= 0.80
very_low:  volume / averageVolume <= 0.55
```

## عقد النتيجة

```ts
{
  phase: 'accumulation' | 'markup' | 'distribution' | 'markdown',
  confidence: number,
  trading_range: { high, low, duration_days },
  current_position: 'below_range' | 'testing_lower_range' | 'middle_range' |
                    'testing_upper_range' | 'above_range',
  events_detected: WyckoffEvent[],
  expected_action: 'markup_soon' | 'follow_trend_up' | 'distribution_risk' |
                   'markdown_soon' | 'wait_for_confirmation',
  target_zone: { min, max } | null,
  signals: [{ type, strength, reason }],
  data_quality: { candles, minimum_required, sufficient, warnings }
}
```

سعر الحدث يعكس طبيعة الحدث: القاع للكسر السفلي، القمة للكسر العلوي، والإغلاق للأحداث الداعمة. عند غياب الحجم، تظل الحسابات متاحة لكن يظهر تحذير جودة ولا يتم اختلاق تصنيف دقيق للحجم.

## الاختبارات

`server/tests/wyckoff.test.ts` يحتوي على **20 اختباراً** تشمل:

- الحد الأدنى للبيانات وإرجاع `null`.
- PS وSC وAR وST.
- كشف Spring والعودة السريعة.
- رفض Spring بلا عودة فوق النطاق.
- Test بحجم أقل من Spring.
- UT والعودة السريعة أسفل النطاق.
- تصنيف Accumulation وDistribution.
- target zone والثقة والموقع الحالي.
- التحذير عند غياب الحجم.

## قرار الدمج

Wyckoff غير مربوط حالياً بالـ Orchestrator أو API. الدمج يحتاج مرحلة مستقلة لعقد response، وأداء الحساب، وتوافق بيانات النطاق قبل الظهور للمستخدم النهائي.
