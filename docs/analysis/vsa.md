# Volume Spread Analysis (VSA) — المرحلة 3

## النطاق

المحرك المستقل موجود في:

`server/src/services/analysis/vsa.service.ts`

لا يتم ربطه حالياً بالـ Orchestrator أو بأي endpoint إنتاجي. يعتمد VSA على العلاقة بين **النطاق السعري، الحجم، ومكان الإغلاق**، لذلك لا يختلق تحليلاً عند نقص الشموع أو الحجم.

## تحليل الشمعة

لكل شمعة يحسب المحرك:

```text
Spread = High − Low
Spread Ratio = Spread / Average Previous Spread
Volume Ratio = Volume / Average Previous Volume
Close Position = (Close − Low) / (High − Low)
```

وتصنف القيم وفق القواعد:

| المقياس | التصنيف |
|---|---|
| Volume > 2x | `very_high` |
| Volume 1.5–2x | `high` |
| Volume 0.7–1.5x | `moderate` |
| Volume 0.5–0.7x | `low` |
| Volume < 0.5x | `very_low` |
| Spread > 1.5x | `wide` |
| Spread 0.7–1.5x | `normal` |
| Spread < 0.7x | `narrow` |
| Close Position > 0.7 | `strong` |
| Close Position 0.3–0.7 | `middle` |
| Close Position < 0.3 | `weak` |

## الأنماط الاثنا عشر

1. **No Demand:** شمعة صاعدة ضيقة بحجم منخفض؛ إشارة هبوطية ضعيفة.
2. **No Supply:** شمعة هابطة ضيقة بحجم منخفض؛ إشارة صعودية.
3. **Stopping Volume:** هبوط بعد اتجاه هابط، حجم >2x، وإغلاق في أعلى 30%.
4. **Selling Climax:** شمعة هابطة واسعة بحجم >2x وقاع جديد؛ انعكاس صعودي محتمل.
5. **Buying Climax:** شمعة صاعدة واسعة بحجم >2x وقمة جديدة؛ تصريف محتمل.
6. **Upthrust:** قمة جديدة مع إغلاق في أسفل المدى وحجم مرتفع؛ إشارة عرض.
7. **Shakeout:** قاع جديد مع إغلاق قوي وحجم مرتفع؛ طلب/تجميع محتمل.
8. **Test Bar:** قرب قاع أو قمة سابقة، حجم <0.5x، دون كسر جديد.
9. **Effort to Rise:** نطاق واسع صاعد بحجم مرتفع.
10. **Effort to Fall:** نطاق واسع هابط بحجم مرتفع.
11. **Absorption:** حجم مرتفع مع نطاق ضيق وإغلاق متوسط.
12. **Reverse Upthrust:** كسر سفلي مع إغلاق قوي بحجم متوسط؛ عكس نمط Upthrust.

## عقد النتيجة

```ts
{
  available: boolean,
  patterns: [{ pattern, date, signal, strength, description, index }],
  volume_character: 'accumulation' | 'distribution' | 'balanced',
  supply_demand_balance: {
    buyers: number,
    sellers: number,
    dominant: 'buyers' | 'sellers' | 'balanced'
  },
  recent_bars: [{ spread_ratio, volume_ratio, close_position, pattern }],
  alerts: string[],
  data_quality: { candles, minimum_required, warnings }
}
```

تعتمد `buyers` و`sellers` على نسبة إشارات الشموع المصنفة bullish/bearish، وتساوي مجموعها 100. أما `volume_character` فيستخدم كثافة الأنماط الحديثة: تكرار الأنماط الصعودية يعني `accumulation`، وتكرار الأنماط الهبوطية يعني `distribution`، وإلا فهي `balanced`.

## الاختبارات

`server/tests/vsa.test.ts` يحتوي على **33 اختباراً**، تشمل:

- تحليل Spread وVolume Ratio وClose Position.
- الأنماط الاثني عشر.
- رفض No Demand وNo Supply عند الحجم الطبيعي.
- الحدود الدقيقة لتصنيف الحجم والنطاق.
- التوازن بين المشترين والبائعين.
- accumulation/distribution وalerts.
- عدم الاختلاق عند نقص البيانات والتحذير عند غياب الحجم.

## قرار الدمج

VSA غير مربوط حالياً بالـ Orchestrator أو Elliott أو Gann أو Wyckoff. الدمج يحتاج مرحلة لاحقة لعقد API ومراجعة أداء الحساب على سلاسل EGX/TASI الحقيقية.
