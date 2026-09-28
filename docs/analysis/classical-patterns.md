# Classical Chart Patterns — المرحلة 4

## النطاق

المحرك المستقل موجود في:

`server/src/services/analysis/classical-patterns.service.ts`

لا يتم دمجه حالياً مع Orchestrator أو واجهة الإنتاج. يعتمد على سلسلة OHLCV ويعيد فقط الأنماط التي تحقق شروطاً كمية واضحة؛ البيانات غير الكافية تعيد `available: false`، والسوق المسطح لا ينتج نمطاً آلياً.

## الأنماط المدعومة

### أنماط الانعكاس

```text
Head & Shoulders       /\__ /\
Inverse H&S            \/__ \/
Double Top             /\  /\
Double Bottom          \/  \/
Triple Top             /\ /\ /\
Triple Bottom          \/ \/ \/
Rounding Top           قمة منحنية تدريجياً
Rounding Bottom        قاع مستدير تدريجياً
```

### أنماط الاستمرارية

- Ascending Triangle
- Descending Triangle
- Symmetrical Triangle
- Bullish Flag
- Bearish Flag
- Bullish Pennant
- Bearish Pennant
- Rectangle
- Rising Wedge
- Falling Wedge
- Cup & Handle
- Ascending/Descending Channel

## عقد النتيجة

```ts
{
  name,
  nameAr,
  status: 'forming' | 'confirmed' | 'failed',
  direction: 'bullish' | 'bearish' | 'neutral',
  confidence,
  points,
  confirmation_level,
  invalidation_level,
  target,
  target_calculation,
  volume_confirmation,
  duration_days,
  strength: 'weak' | 'moderate' | 'strong'
}
```

## قواعد الكشف

### Head & Shoulders

- ثلاث قمم محلية مرتبة زمنياً.
- الرأس أعلى من الكتفين بما لا يقل عن 5%.
- فرق الكتفين لا يتجاوز 5%.
- خط العنق هو أدنى قاع بين القمم.
- الهدف:

```text
Neckline − (Head − Neckline)
```

### Inverse Head & Shoulders

نفس القاعدة مع ثلاث قيعان، والرأس أدنى من الكتفين. الهدف:

```text
Neckline + (Neckline − Head)
```

### Double/Triple Top وBottom

- القمم أو القيعان متقاربة ضمن 3%.
- يجب أن يكون العمق المقاس بين نقطة النمط وخط العنق 3% على الأقل.
- الهدف يعتمد على عرض النطاق:

```text
Top:    Neckline − (Top − Neckline)
Bottom: Neckline + (Neckline − Bottom)
```

### Triangles

يُقسّم آخر 25 باراً إلى خمس شرائح لحساب الحدود:

- Ascending: حد علوي شبه ثابت وقاع صاعد.
- Descending: قمة هابطة وحد سفلي شبه ثابت.
- Symmetrical: قمة هابطة وقاع صاعد.
- الهدف: الاختراق ± 75% من عرض المثلث.

### Flags وPennants

- عمود سعري واضح خلال الجزء السابق.
- تصحيح قصير بحجم أقل.
- الهدف = مستوى الاختراق ± ارتفاع العمود.

### Rectangle

- خمس لمسات أو أكثر للحدود.
- عرض بين 3% و25% من الحد السفلي.
- الهدف = الاختراق ± عرض المستطيل.

### Wedges وChannel وCup & Handle

تستخدم مقارنة ميل القمم والقيعان، عمق الكوب والعروة، أو الحركة الاتجاهية خلال آخر 20 باراً. لا يُعاد النمط عند عدم تحقق الحركة أو العمق الأدنى.

## الحالة والثقة

- `forming`: السعر لم يؤكد الاختراق بعد.
- `confirmed`: السعر تجاوز مستوى التأكيد في اتجاه النمط.
- `failed`: السعر تجاوز مستوى الإبطال.
- `confidence` محصورة بين 0 و1، و`strength` مشتقة منها.

تأكيد الحجم محافظ عند غياب الحجم، وتُضاف ملاحظة إلى `data_quality.warnings` بدلاً من اختلاق تأكيد.

## الاختبارات

`server/tests/classical-patterns.test.ts` يحتوي على **31 اختباراً** تشمل:

- H&S وInverse H&S.
- Double/Triple Top وBottom.
- المثلثات الثلاثة.
- Flags وPennants في العقد.
- Rectangle وChannel.
- الحدود الدنيا للأهداف والعمق.
- رفض السوق المسطح والبيانات القصيرة.
- الحالات والثقة والأهداف وعدم التكرار.
