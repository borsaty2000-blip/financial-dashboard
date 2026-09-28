# Market Regime Detection Engine — المرحلة 8

## النطاق

المحرك المستقل موجود في:

`server/src/services/analysis/market-regime.service.ts`

لا يتم دمجه حالياً مع Orchestrator أو الواجهة. يعتمد على مكتبة المؤشرات في المرحلة الأولى ويعيد أوزاناً يمكن استخدامها لاحقاً مع Confluence.

## الأنظمة العشرة

1. **Strong Trend Up:** ADX أكبر من 30، السعر فوق EMA50، والحجم متوسع.
2. **Strong Trend Down:** ADX أكبر من 30، السعر تحت EMA50، والحجم متوسع.
3. **Weak Trend Up:** ADX من 20 إلى 30 والسعر فوق EMA50.
4. **Weak Trend Down:** ADX من 20 إلى 30 والسعر تحت EMA50.
5. **Range:** ADX أقل من 20، وعرض Bollinger أقل من 8%، والسعر قريب من الوسط.
6. **Accumulation:** نطاق جانبي بعد أداء هابط سابق مع سلوك OBV غير هابط بوضوح.
7. **Distribution:** نطاق جانبي بعد أداء صاعد سابق مع سلوك OBV غير صاعد بوضوح.
8. **High Volatility:** ATR% أكبر من 4% أو عرض Bollinger أكبر من 8%.
9. **Low Volatility:** ATR% أقل من 1.5% وعرض Bollinger أقل من 3%.
10. **Breakout/Post-Breakout:** كسر نطاق حديث مع تأكيد ارتفاع الحجم.

تُفحص الأنظمة بترتيب يمنع التصنيفات المتداخلة: الاتجاه القوي، ثم الاختراق، ثم التقلب، ثم النطاق والتجميع/التصريف، ثم الاتجاه الضعيف.

## الخصائص المحسوبة

- ADX.
- ATR كنسبة من السعر.
- Bollinger Width كنسبة مئوية.
- شخصية الحجم:
  - `expanding`
  - `normal`
  - `contracting`
  - `unavailable`
- الثقة بين 0 و1.
- مدة النظام الحالية بالشموع.

يُقاس توسع الحجم مقابل متوسط آخر 20 شمعة سابقة، مع استبعاد الشمعة الحالية لتجنب تخفيف إشارة الارتفاع الأخيرة.

## Regime Weights

| النظام | الأوزان الأساسية |
|---|---|
| Strong/Weak Trend | trend 1.5، momentum 1.2، mean_reversion 0.5، oscillators 0.8 |
| Range | mean_reversion 1.5، oscillators 1.3، trend 0.6، macd 0.7 |
| High Volatility | volatility 1.5، breakout 1.4، mean_reversion 0.5 |
| Low Volatility | breakout_anticipation 1.2، range 1.3، volatility 0.7 |
| Accumulation/Distribution | wyckoff 1.5، vsa 1.4، volume 1.3، trend 0.5 |
| Breakout | momentum 1.5، volume 1.4، trend 1.3، mean_reversion 0.4 |

كل وزن افتراضي يبدأ من 1.0، وتُضاف الأوزان المتخصصة للنظام المختار.

## Transition Detection

يتم مقارنة snapshot الحالي بنافذة سابقة لاكتشاف:

- Trend إلى Range عند تغير ADX.
- Range إلى Breakout عند توسع Bollinger والحجم.
- Low Volatility إلى High Volatility عند اتساع ATR.
- أي تغير مادي آخر في خصائص النظام يُسجل كتحول غير متخصص.

الناتج يشمل:

```ts
{
  detected,
  from,
  to,
  progress,
  confirmed,
  reason
}
```

## Regime History

يُستخدم آخر 200 شمعة، ويُسجل آخر 50 snapshot تقريباً مع:

- النظام لكل نقطة.
- مدة النظام الحالي.
- متوسط مدة الأنظمة.
- عدد التغيرات في نافذة 60 نقطة.
- النظام السابق وتاريخ نهايته.

## Trading Context

- Trend: `trend_following` مع مخاطرة منخفضة نسبياً.
- Range/Accumulation/Distribution: `range_trading` مع مخاطرة متوسطة.
- High Volatility/Breakout: `breakout_momentum` مع حجم مركز مخفض ومخاطرة مرتفعة.
- Low Volatility: `volatility_contraction` مع مراقبة الاختراق.

## جودة البيانات

يحتاج المحرك إلى 50 شمعة على الأقل. عند نقص البيانات يعيد:

```text
available: false
regime: null
```

ولا يُنشئ نظاماً مصطنعاً. غياب الحجم لا يمنع الحساب السعري، لكنه يجعل شخصية الحجم `unavailable` أو محافظة ويظهر تحذير جودة.

## الاختبارات

`server/tests/market-regime.test.ts` يحتوي على **33 اختباراً** تشمل:

- الاتجاهات الصاعدة والهابطة.
- Range والتقلب العالي والمنخفض.
- الأنظمة العشرة وعقد الثقة.
- الأوزان المتخصصة.
- التحولات.
- التاريخ والمدة.
- البيانات الناقصة وغياب الحجم.
