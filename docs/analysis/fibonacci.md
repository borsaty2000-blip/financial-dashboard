# Fibonacci Engine — المرحلة 6

## النطاق

المحرك المستقل موجود في:

`server/src/services/analysis/fibonacci.service.ts`

يستخدم محرك Support/Resistance السابق عند حساب نقاط الالتقاء، لكنه لا يُدمج مع Orchestrator أو واجهة الإنتاج في هذه المرحلة.

## اختيار Swing

- يستخدم آخر 200 شمعة كحد أقصى.
- يختار أعلى High وأدنى Low في النطاق.
- لا يعتمد swing إلا إذا تجاوز الفرق 5% من السعر المرجعي.
- إذا لم يوجد تحرك واضح، تكون النتيجة `available: false` دون اختلاق مستويات.
- `direction: up` عندما يسبق القاع القمة، و`direction: down` عندما تسبق القمة القاع.

## Retracement

النسب المدعومة:

```text
23.6%, 38.2%, 50.0%, 61.8%, 78.6%, 88.6%, 100.0%
```

للSwing الصاعد:

```text
Price = High − (Range × Ratio)
```

للSwing الهابط:

```text
Price = Low + (Range × Ratio)
```

قوة المستويات:

| النسبة | القوة | الدلالة |
|---:|---:|---|
| 61.8% | 10 | Golden Ratio |
| 50.0% | 9 | Major |
| 38.2% | 8 | Major |
| 23.6% | 7 | Standard |
| 78.6% | 7 | Standard |
| 88.6% | 5 | Standard |
| 100.0% | 6 | Standard |

## Extension

النسب:

```text
127.2%, 161.8%, 200.0%, 261.8%, 361.8%, 423.6%
```

للSwing الصاعد:

```text
Price = Low + (Range × Extension Ratio)
```

ويُعكس الاتجاه للSwing الهابط حول القمة.

## Expansion ABCD

عند توفير نقاط `A/B/C`:

```text
Expansion = A + (C − B) × Ratio
```

النسب:

```text
1.0, 1.272, 1.618
```

## Projection

عند توفير نقطتي الإسقاط `A/B`:

```text
Projection = A + (B − A) × Ratio
```

النسب:

```text
0.618, 1.0, 1.618
```

## Fibonacci Time Zones

من آخر pivot أو `timeZoneBaseIndex` اختياري، تُحسب تواريخ مستقبلية بواسطة:

```text
1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144 days
```

التصنيف:

- `short`: حتى 21 يوماً.
- `medium`: من 34 إلى 55 يوماً.
- `long`: من 89 إلى 144 يوماً.

## Confluence

يتم جمع مستويات Fibonacci والامتدادات والإسقاطات مع مستويات Support/Resistance السابقة. إذا اجتمعت ثلاثة مصادر أو أكثر ضمن مسافة أقل من 0.5%، تُنشأ نقطة التقاء:

```ts
{
  price,
  sources,
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong',
  confidence,
  type: 'support' | 'resistance'
}
```

الثقة تبدأ من 0.55 وتزداد مع عدد المصادر، وتُحصر دون 1.0. المناطق الزمنية تُعرض مستقلة لأنها بُعد زمني وليست سعراً، ولا يتم دمج تاريخ مع سعر في نقطة واحدة بشكل مصطنع.

## التعامل مع نقص البيانات

- أقل من 30 شمعة: `available: false`.
- لا يوجد Swing بتحرك 5%: `available: false`.
- غياب الحجم لا يمنع الحساب السعري، لكنه ينتج تحذيراً؛ لأن Support/Resistance confluence يصبح محافظاً.

## الاختبارات

`server/tests/fibonacci.test.ts` يحتوي على **37 اختباراً** تشمل:

- Retracement صاعد وهابط.
- قوة 61.8%.
- Extensions.
- ABCD Expansion.
- Projection.
- Time Zones قصيرة ومتوسطة وطويلة.
- Confluence contract.
- نقص البيانات وغياب الحجم.
- finite prices وثبات العقد.
