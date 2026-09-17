# Provider Router — 17 سبتمبر 2026

يقرأ النظام اختيار الأولوية اختيارياً من `PROVIDER_PRIORITY_JSON`، ويقرأ حدود freshness من `FRESHNESS_THRESHOLDS_JSON`. الإعداد الافتراضي هو:

```json
{
  "CRYPTO": ["binance", "twelve", "yahoo"],
  "EGX": ["sahmk", "twelve", "yahoo"],
  "TASI": ["sahmk", "twelve", "yahoo"]
}
```

وحدود العمر الافتراضية هي: 30 ثانية لـ `1m`، و120 ثانية لـ `5m`، و300 ثانية لـ `15m`، و900 ثانية لـ `1h`، و86400 ثانية لـ `1d`.

لا يتحول المصدر إلى `live` إلا إذا عاد timestamp من المصدر نفسه، وكان العمر داخل الحد، وأعلن المصدر `realtime=true`، وتم تأكيد تغطية الرمز. بخلاف ذلك يعاد `delayed` أو `unavailable` مع تحذير صريح.

الاختبار العام:

```text
GET /api/provider/config
GET /api/provider/test?market=EGX&symbol=COMI
GET /api/provider/test?market=TASI&symbol=1010
GET /api/provider/test?market=CRYPTO&symbol=BTCUSDT
```

في اختبار 17 سبتمبر 2026: `BTCUSDT` صنف حيّاً عبر Binance، بينما `COMI` و`1010` لم يثبتا realtime وظلا متأخرين. هذا التصنيف مقصود لحماية المستخدم من عرض بيانات متأخرة على أنها لحظية.
