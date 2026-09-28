# Support/Resistance Engine — المرحلة 5

## النطاق

المحرك المستقل موجود في:

`server/src/services/analysis/support-resistance.service.ts`

لا يتم دمجه حالياً مع Orchestrator أو محركات Elliott وGann وConfluence وWyckoff وVSA وClassical Patterns.

## المصادر التسعة

1. **Swing Highs/Lows:** قمم وقيعان محلية بثلاث نوافذ lookback: 5 و10 و20.
2. **Volume Profile:** يحسب POC، ويدعم VAH وVAL ضمن منطقة تغطي 70% من الحجم.
3. **Fibonacci:** نسب 23.6% و38.2% و50% و61.8% و78.6% من آخر نطاق سعري واسع.
4. **Gann Angles:** مستويات تقريبية 1x1 و2x1 و1x2 من آخر pivot منخفض مع مقياس حركة الشموع.
5. **Psychological Levels:** أقرب مستويات مستديرة حسب مقياس السعر: 1 أو5 أو25 أو100.
6. **Previous Day:** أعلى وأدنى المقطع السابق ذي الفترة 1.
7. **Previous Week:** أعلى وأدنى المقطع السابق ذي الفترة 5.
8. **Previous Month:** أعلى وأدنى المقطع السابق ذي الفترة 20.
9. **Gaps:** فرق فتح جوهري بين افتتاح شمعة وإغلاق الشمعة السابقة، بحد أدنى 0.5%.

## تقييم المستوى

لكل مستوى خام يتم حساب اللمسات والارتدادات والكسور من الشموع اللاحقة:

```text
Bounce Rate = Bounces / Touches
Break Rate  = Breaks / Touches
```

درجة القوة:

```text
Strength =
  Number of Unique Sources
  + (Touches × 0.5)
  + (Bounce Rate × 10)
  + (Number of Timeframes × 0.5)
  + Freshness Bonus
```

ثم تُحصر النتيجة بين 0 و10. حداثة المستوى تُحسب من عمر آخر تفاعل بالنسبة إلى طول السلسلة.

## دمج المستويات

إذا كان مستويان من النوع نفسه تفصل بينهما أقل من 0.5%، يُدمجان في Cluster واحد:

- متوسط السعر يصبح قيمة المستوى.
- تُجمع المصادر والفريمات.
- يُعاد حساب اللمسات والارتداد والكسر والقوة.
- لا تُحافظ النتيجة على مستويات متكررة منفصلة.

## عقد النتيجة

```ts
{
  available,
  levels,
  nearest_resistance,
  nearest_support,
  top_resistances,
  top_supports,
  zone_analysis: {
    current_zone,
    position_in_range,
    range_high,
    range_low
  },
  data_quality
}
```

لا يتم عرض أكثر من خمسة مستويات في كل قائمة، وتُحذف المستويات ذات القوة الأقل من 4. الترتيب العام يكون تنازلياً حسب القوة، مع أولوية تبدأ من 1.

## منطقة السعر

```text
position_in_range =
  (current - range_low) / (range_high - range_low)
```

وتُحصر بين 0 و1. تصنيف المنطقة:

- `below_range`
- `near_support`
- `mid_range`
- `near_resistance`
- `above_range`

## البيانات غير الكافية

يحتاج المحرك إلى 30 شمعة على الأقل. عند عدم توفر الحجم، يستمر التحليل السعري وتظهر ملاحظة جودة تفيد بأن ثقة Volume Profile محافظة، دون اختلاق بيانات حجم.

## الاختبارات

`server/tests/support-resistance.test.ts` يحتوي على **34 اختباراً** تشمل:

- مصادر Swing وVolume Profile وFibonacci وGann.
- المستويات النفسية وPDH/PDL وPWH/PWL وPMH/PML والفجوات.
- دمج المستويات القريبة.
- القوة واللمسات ومعدلات الارتداد والكسر.
- الترتيب والأولوية وقوائم الخمسة.
- أقرب دعم ومقاومة ومنطقة السعر.
- رفض البيانات القصيرة والتحذير عند غياب الحجم.
