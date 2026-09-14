# المراجعة الهندسية الشاملة — بورصتي

**التاريخ:** 14 سبتمبر 2026

## النطاق والمنهجية

أُجريت المراجعة على مستودع `financial-dashboard` وعلى الإصدار المنشور في `borsatyai.com`. شملت المراجعة تحميل HTML وJavaScript وCSS من المتصفح، فحص Console وموارد الشبكة، اختبار endpoints الإنتاج، اختباراً محلياً لنفس Express app في وضع Vercel، فحص مسارات السوق والتحليل والمصادقة، وفحصاً مباشراً لمصادر البيانات العامة. لم تُستخدم قيم سوقية مختلقة، ولم يُنفَّذ تسجيل حساب حقيقي أو تعديل قاعدة بيانات الإنتاج.

## الملخص التنفيذي

الواجهة الأمامية كانت تُحمّل بنجاح: الصفحة الرئيسية أعادت HTTP 200، وملفا JavaScript وCSS تحمّلا، ولم يظهر Console output في جلسة الفحص. ظهور شرطات `—` لم يكن مشكلة CSS أو React؛ كان نتيجة فشل API Gateway بالكامل.

كان الإصدار الإنتاجي `825007b` جاهزاً في Vercel ومديراً للنطاق الرسمي، لكن كل استدعاء API كان يفشل بسبب تهيئة `multer.diskStorage()` أثناء استيراد الخادم ومحاولة إنشاء `/var/task/server/uploads/avatars` على نظام ملفات Vercel للقراءة فقط. لذلك فشل حتى `/api/health` قبل الوصول إلى route المطلوب.

تم إصلاح سبب الانهيار في الكود محلياً: أصبح التخزين المحلي يستخدم القرص، بينما يستخدم Vercel `memoryStorage` مع إرجاع HTTP 503 واضح لرفع الصور إلى أن يُربط تخزين ملفات دائم. كما أضيفت عقود `/api/market/summary` و`/api/market/gold` و`/api/market/silver`، وأضيف fallback حقيقي للذهب والفضة عبر Twelve Data عند غياب جسر EGX الرسمي، وصُحح عرض نسبة تغير TASI في الواجهة.

## حالة الإنتاج قبل نشر الإصلاح الجديد

| الفحص                          |                                                            النتيجة المقاسة |
| ------------------------------ | -------------------------------------------------------------------------: |
| `https://borsatyai.com/`       |                                                                   HTTP 200 |
| HTML/JS/CSS                    |                                                               محمّلة بنجاح |
| Console                        |                                                لا توجد رسائل في جلسة الفحص |
| طلبات الصفحة                   | `/api/market/egx/summary` و`/api/market/tasi/summary` و`/api/news?limit=6` |
| `/api/health`                  |                                     HTTP 500، `FUNCTION_INVOCATION_FAILED` |
| `/api/market/summary`          |                                                                   HTTP 500 |
| `/api/market/egx/summary`      |                                                                   HTTP 500 |
| `/api/market/tasi/summary`     |                                                                   HTTP 500 |
| `/api/market/gold`             |                                                                   HTTP 500 |
| `/api/market/egx/companies`    |                                                                   HTTP 500 |
| `/api/analysis/COMI/elliott`   |                                                                   HTTP 500 |
| `/api/analysis/COMI/gann`      |                                                                   HTTP 500 |
| `/api/analysis/COMI/consensus` |                                                                   HTTP 500 |
| `/api/news?limit=6`            |                                                                   HTTP 500 |

خطأ Vercel الفعلي:

```text
Error: ENOENT: no such file or directory, mkdir '/var/task/server/uploads/avatars'
at ... server/src/routes/profile.routes.ts
```

الإصدار `825007b` كان مربوطاً بـ`borsatyai.com` وReady في Vercel بزمن بناء مقاس قدره 53 ثانية، لكن Ready لا يعني أن كل Serverless invocation سليم؛ سجلات Runtime أثبتت فشل الاستيراد عند أول طلب API.

## نتائج الاختبار المحلي بعد الإصلاح

تم تشغيل Express في وضع `VERCEL=1` واختبار عقود الإنتاج من خادم HTTP معزول:

| المسار                              | HTTP | الزمن التقريبي | النتيجة                                                    |
| ----------------------------------- | ---: | -------------: | ---------------------------------------------------------- |
| `/api/health`                       |  200 |          47 ms | سليم                                                       |
| `/api/market/summary`               |  200 |          4.1 s | TASI متاح، معادن جزئية                                     |
| `/api/market/egx/summary`           |  200 |          1.2 s | ذهب متاح، فضة غير متاحة في العينة                          |
| `/api/market/tasi/summary`          |  200 |      1.0–1.6 s | SAHMK يعيد TASI متأخراً بحسب حقل المزود                    |
| `/api/market/gold`                  |  200 |          1.7 s | Twelve Data يعيد XAU/USD                                   |
| `/api/market/egx/companies`         |  200 |           4 ms | متاح صراحةً كـunavailable مع `data: []`                    |
| `/api/analysis/COMI/elliott`        |  200 |          6.5 s | نتيجة تحليل مبنية على 175 شمعة من Yahoo في الاختبار المحلي |
| `/api/analysis/COMI/gann`           |  200 |          12 ms | نتيجة تحليل مبنية على السلسلة المخزنة في ذاكرة الخدمة      |
| `/api/analysis/COMI/consensus`      |  200 |          19 ms | score=63، مع disclaimer المنتج التعليمي                    |
| `/api/news?limit=6`                 |  200 |          8.0 s | لا أخبار متاحة في جلسة الاختبار، دون بيانات مخترعة         |
| `/api/auth/me` بلا token            |  401 |           9 ms | السلوك الأمني المتوقع                                      |
| `POST /api/auth/register` بجسم فارغ |  400 |          43 ms | validator يعمل؛ لم يُنشأ مستخدم حقيقي                      |

## طبقة مصادر البيانات

| المصدر                             |               الاختبار الخارجي المباشر | التقييم                                                                |
| ---------------------------------- | -------------------------------------: | ---------------------------------------------------------------------- |
| Yahoo Finance `COMI.CA` و`2222.SR` |                               HTTP 429 | المصدر يفرض rate limit من بيئة الاختبار؛ لا يجوز اعتباره متاحاً دائماً |
| Stooq EGX                          | HTTP 200 لكن صفحة JavaScript challenge | ليس CSV قابلاً للاستهلاك الآلي في هذه البيئة                           |
| SAHMK دون API key                  |                               HTTP 401 | العقد صحيح، والمفتاح مطلوب؛ الاختبار المحلي أعاد TASI عند وجود المفتاح |
| Finnhub دون API key                |                               HTTP 401 | المفتاح مطلوب؛ لا تُعرض قيم بديلة عند غيابه                            |
| Twelve Data دون API key            |                               HTTP 401 | المفتاح مطلوب؛ الاختبار المحلي أعاد XAU/USD عند وجوده                  |
| EGX official bridge                |                     غير متاح في Vercel | `EGX_ADAPTER_SCRIPT` وبيئة Python الرسمية ليستا مهيأتين في الإنتاج     |

`CandlesService` يطبق ترتيباً واضحاً للمصادر: Twelve Data، SAHMK، Polygon، Yahoo، Stooq، Finnhub، ثم database cache. كل candle يمر عبر تحقق OHLC، والفشل ينتقل للمصدر التالي. عند عدم وجود بيانات يرجع `source: unavailable` بدلاً من أرقام تجريبية.

## الإصلاحات المنفذة في هذه المراجعة

1. **إصلاح انهيار Serverless:** منع `multer.diskStorage()` من التهيئة على Vercel، واستخدام `memoryStorage` غير الكاتب على القرص، مع HTTP 503 صريح لمسار avatar حتى يتوفر object storage دائم.
2. **إضافة عقود API مفقودة:** إضافة `/api/market/summary` و`/api/market/gold` و`/api/market/silver` بما يتوافق مع قائمة الفحص والواجهة.
3. **Fallback المعادن:** استخدام Twelve Data لـ`XAU/USD` و`XAG/USD` عند عدم توفر جسر EGX، مع provenance و`available` و`freshness` بدلاً من اختلاق القيم.
4. **تصحيح provenance:** ملخص المعادن يعلن `Twelve Data Pro` أو `mixed` فعلياً، ولا يصف fallback بأنه EGX MCP.
5. **تصحيح TASI UI:** إضافة قراءة `index_change_percent` حتى يظهر تغير TASI الصحيح عندما يعيد SAHMK هذا الحقل.
6. **اختبارات آلية:** إضافة `npm run test:server` واختبار تكاملي لوضع Vercel لمساري health والمعادن.

## بوابات الجودة

| البوابة                        |                      النتيجة |
| ------------------------------ | ---------------------------: |
| `npm run typecheck`            |                         ناجح |
| `npm run typecheck:packages`   |                         ناجح |
| `npm run test:server`          |                         ناجح |
| `npm test -- --run`            | 19 ملفاً، 91 اختباراً ناجحاً |
| `npm run build`                |                         ناجح |
| Prettier check للملفات المعدلة |                         ناجح |
| `git diff --check`             |                         ناجح |
| Vercel runtime smoke محلي      |             ناجح، health=200 |

## فجوات متبقية لا يجوز إخفاؤها

| الأولوية                | الفجوة                                                                                                          | الإجراء الصحيح                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| حرجة قبل اعتماد الإنتاج | الإصلاح الجديد لم يُنشر بعد في هذه المرحلة بسبب قاعدة عدم النشر دون موافقة صريحة؛ الإنتاج الذي فُحص بقي يرد 500 | اعتماد push/redeploy صريح ثم إعادة اختبار النطاق                             |
| عالية                   | لا يوجد `EGX_ADAPTER_SCRIPT` فعال في Vercel، لذلك EGX30/EGX70/EGX100 وبيانات المعادن الرسمية ليست مضمونة        | ربط مزود EGX مستضافاً في Node أو خدمة Python دائمة، مع مراجعة أسرار وتشغيل   |
| عالية                   | قائمة شركات EGX ترجع `data: []` و`available: false` لأن أداة EGX الرسمية الحالية لا توفر directory              | إضافة endpoint directory مرخص أو مصدر شركات موثق                             |
| متوسطة                  | الأخبار تعيد قائمة فارغة عند فشل RSS، رغم أن الاستجابة 200                                                      | إضافة `available: false` عندما تفشل كل feeds، ومراقبة freshness وfeed health |
| متوسطة                  | رفع الصور غير متاح على Vercel                                                                                   | ربط S3/Cloudinary أو تخزين ملفات دائم؛ لا يُستخدم `/tmp` للتخزين الدائم      |
| متوسطة                  | `DATABASE_URL` وJWT/مزودات الإنتاج تحتاج تحققاً من Vercel Environment Variables دون طباعة القيم                 | فحص secret names وتشغيل health/auth smoke بعد موافقة النشر                   |
| متوسطة                  | Yahoo وStooq غير ثابتين من بيئة الاختبار                                                                        | الاعتماد على مزود مدفوع/مرخص أساسي، مع rate limits وcache ومراقبة            |

## قرار النشر

لم تُعدّل النطاقات ولم يُحذف أي مشروع. لم تُرسل عملية نشر جديدة في هذه المرحلة؛ يلزم اعتماد صريح قبل دفع التغييرات إلى `origin/main` إذا كان الربط التلقائي لـVercel مفعلاً. بعد الاعتماد، يجب تنفيذ بوابة ما بعد النشر التالية: `health`، ملخص EGX، ملخص TASI، الذهب، الأخبار، Elliott، Gann، Consensus، ثم فحص Console وRuntime Logs خلال نافذة قصيرة.


## نتيجة lint وPrisma

مرّ lint المستهدف على `client/src/pages/PublicPages.tsx`. أما `npm run lint` الكامل من مجلد `client` فأخفق بـ160 مشكلة موروثة في صفحات وأدوات قديمة، معظمها `no-explicit-any` و`no-restricted-syntax` و`react-hooks/set-state-in-effect`؛ لم تُنسب هذه المشاكل إلى التغيير الحالي ولم تُخفَ من التقرير. كما نجح `prisma validate` باستخدام URL شكلي آمن من دون اتصال أو migration، مع تحذير Prisma بأن إعداد `package.json#prisma` deprecated في Prisma 7، وهو بند صيانة لاحق.

## الحالة الحالية للـGit

التغييرات الإصلاحية موجودة محلياً وغير مدفوعة بعد إلى `origin/main` بانتظار قرار النشر الصريح. الملفات المعدلة تشمل إصلاح `profile.routes.ts`، عقود `market.routes.ts`، fallback المعادن، نوع مصدر السوق، تصحيح TASI في الواجهة، اختبار serverless، وهذا التقرير.
