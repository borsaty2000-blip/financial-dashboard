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

## نتيجة النشر الأول بعد موافقة المستخدم

تم دفع `6896f5e` إلى `origin/main`، وأصبح `/api/health` على `borsatyai.com` بحالة 200 بعد أربع محاولات مراقبة. بعد النشر أصبحت المسارات التالية 200: health، market summary، EGX summary، TASI summary، gold، EGX companies، consensus، news، وOpenAPI. بقي Elliott وGann بحالة 502 برسالة `fetch failed` لأن `PYTHON_SERVICE_URL` غير موجودة في Vercel، كما ظهرت استجابات `available: false` للبيانات السوقية بسبب غياب `SAHMK_API_KEY` وغياب جسر EGX الرسمي في بيئة الإنتاج.

أضيف بعد ذلك fallback حتمي داخل Node لمعادلات Elliott وGann التعليمية، مع `engine: deterministic-node-fallback` وإخلاء صريح. اختُبر محلياً مع خدمة Python معزولة، وأعاد المساران 200 بعقد fallback واضح. لم يُنشر هذا التعديل الثاني بعد عند كتابة هذه الفقرة.

## فحص المصادقة بعد النشر

اختبار `POST /api/auth/login` ببيانات غير صالحة لم ينشئ أي سجل، لكنه كشف أن Vercel لا يستطيع الوصول إلى Neon، وكانت الاستجابة القديمة تسرب hostname قاعدة البيانات داخل رسالة Prisma. فحص DNS أظهر أن المضيف يحل إلى `63.182.37.92` وأن TCP/5432 متاح من بيئة الفحص، لذلك يلزم التحقق من قيمة `DATABASE_URL` واسم المضيف/SSL في Vercel وNeon دون كشف السر. عُدّل auth controller محلياً لتحويل أخطاء Prisma/اتصال قاعدة البيانات إلى HTTP 503 برسالة عربية عامة، وتحويل تعارض uniqueness إلى 409، ومنع تسريب تفاصيل الاتصال.

## ملحق المسح الشامل وإصلاحات الجولة الحالية

فحصت الواجهة فعلياً عبر النطاق العام على صفحات التسجيل، الدخول، السوق المصري، تفاصيل COMI، المحفظة، ومنشئ الاستراتيجيات. أعادت مسارات SPA حالة HTTP 200، ورُسمت صفحات التسجيل والدخول والسوق ومنشئ الاستراتيجيات دون أخطاء Console أولية. صفحة تفاصيل السهم كانت تبقى في skeleton عند تأخر خدمة الشموع ولا تعرض حالة فارغة صريحة؛ أضيفت مهلة 12 ثانية وحالة عدم توفر واضحة بدلاً من ترك المستخدم أمام شاشة انتظار.

شمل smoke test الإنتاجي 74 مساراً عاماً ومحمياً. قبل الإصلاحات الجديدة كانت النتائج 33 مساراً بحالة 200، ومسار واحد 401 صحيحاً، و30 مساراً 429 بسبب ضرب محدد المعدل العام بالتوازي، و10 مسارات 502. مسارات 502 التحليلية كانت ناتجة عن `fetch failed` من Python service غير المتاح في Vercel، ومسار الفحص الشرعي كان يتطلب `HALAL_TERMINAL_API_KEY`. لذلك لا يجوز تفسير 429 الناتجة عن الاختبار المتوازي كفشل مصادقة.

## إصلاح التسجيل وonboarding

كان نموذج التسجيل يجمع الأسواق والخبرة وأسلوب الاستثمار لكنه لا يرسلها إلى الخادم، كما كان يقرأ checkbox الشروط من DOM ويتيح إرسالاً مكرراً بلا حالة تحميل. أصبح عقد التسجيل يقبل تفضيلات onboarding متحققة، وتحفظ مع إنشاء المستخدم داخل المعاملة نفسها، وأصبح النموذج يتحقق من صيغة البريد وقوة كلمة المرور، ويدير `submitting`، ويربط الشروط بصفحات `/terms` و`/disclaimer`. لا يزال إنشاء الحساب في الإنتاج متوقفاً إلى أن تُصلح قيمة `DATABASE_URL`/اتصال Neon في Vercel؛ لم يتم إنشاء حساب تجريبي أو تعديل قاعدة بيانات الإنتاج أثناء التدقيق.

## إصلاح غياب Python في Serverless

أضيفت fallbacks تعليمية حتمية داخل Node للإحصاء، وARIMA/LSTM كخط اتجاه معلّم بوضوح، وensemble، والمشاعر كـunavailable صريح، ورصد الشذوذ، وbacktesting. هذه البدائل لا تدّعي تشغيل النموذج المطلوب ولا تنتج أسعاراً حية أو توصيات؛ تحمل provenance وdisclaimer واضحين. كما أُصلح `/api/analysis/:symbol/anomalies` ليدعم الأسعار اليدوية بدلاً من اشتراط candles فارغة، وحُوّل فشل فحص Halal إلى استجابة HTTP 200 مع `available:false` ورسالة واضحة بدلاً من 502.

اختبار تكامل محلي في وضع Vercel مع `PYTHON_SERVICE_URL` غير متاح أثبت أن المسارات statistical وARIMA وLSTM وensemble وanomalies وsentiment وbacktest تعود 200 وتستعمل fallback الآمن. لم تُنشر هذه الإصلاحات بعد؛ النشر يتطلب موافقة صريحة لأنه سيغيّر الإنتاج.

## بوابات الجودة بعد الجولة الحالية

نجحت `npm run typecheck` و`npm run typecheck:packages` و`npm run test:server` بأربع اختبارات و`npm run test:auth` بخمسة اختبارات و`npm test -- --run` بـ19 ملفاً و91 اختباراً و`npm run build` وPrettier و`git diff --check`. فشل lint الكامل سابقاً بسبب مخالفات `any` موروثة في صفحات Account وStockDetail، وليس بسبب أخطاء TypeScript أو فشل build؛ يجب تخصيص مهمة lint debt مستقلة قبل اعتبار بوابة lint كاملة.

## القيود الخارجية المفتوحة

تحتاج المصادقة إلى اتصال Neon صالح في Vercel؛ لا يمكن إصلاح كلمة المرور أو قيمة `DATABASE_URL` من الكود دون secret جديد. تحتاج السوق السعودية إلى `SAHMK_API_KEY`، ويحتاج جسر EGX إلى `EGX_ADAPTER_SCRIPT`/موصل صالح، ويحتاج الفحص الشرعي إلى `HALAL_TERMINAL_API_KEY`، بينما Python features تحتاج `PYTHON_SERVICE_URL` إذا أريد تشغيل النماذج الأصلية بدلاً من fallbacks. لم تُطبع أي قيمة سرية ولم تُجرَ migration أو نشر إضافي خلال هذه الجولة.

## نتيجة نشر c0ed8bc وفحص ما بعد النشر

تم دفع `c0ed8bc` إلى `origin/main` بعد موافقة المستخدم، وأصبح الإصدار جاهزاً على النطاق الرسمي. احتاج readiness إلى محاولتين؛ في الأولى كان `/api/health` بحالة 200 بينما كان statistical ما زال 502، ثم عاد statistical إلى 200 في المحاولة الثانية. اختبار ما بعد النشر أثبت: `/api/health` وملخصات السوق والأخبار وElliott وConsensus وstatistical وARIMA وLSTM وensemble وanomalies وbacktest والفحص الشرعي تعود 200، و`/api/auth/me` بلا token يعيد 401 المتوقع.

أظهر الفحص أن السعودية والمعادن تعيدان `available:false` عند غياب `SAHMK_API_KEY` أو جسر EGX الرسمي، من دون أرقام مختلقة. كما أن `/api/news` كان يعيد `available:true` مع قائمة فارغة؛ أضيف محلياً إصلاح يجعلها `available:false` مع رسالة واضحة عندما لا تُرجع أي feed أخباراً، واختُبر محلياً مع Gann والأخبار. هذا الإصلاح الأخير يحتاج commit ودفعاً منفصلاً قبل أن يظهر في الإنتاج.

لم يُنفذ إنشاء حساب حقيقي: اختبار جسم التسجيل الفارغ عاد 400 validator، أما إنشاء مستخدم صالح فمتوقف على إصلاح `DATABASE_URL` في Vercel ويتطلب payload اختباراً صريحاً حتى لا يُنشأ حساب غير مقصود.

## نتيجة اختبار DATABASE_URL واكتشاف schema drift

بعد تحديث `DATABASE_URL` في Vercel أصبح `/api/health` بحالة 200، وأصبح طلب التسجيل يصل إلى Prisma بدلاً من الفشل في الاتصال. أعاد التسجيل الحالة 400 بسبب أن عمود `twoFactorEnabled` غير موجود في قاعدة الإنتاج، ما يثبت أن المشكلة الحالية هي **schema drift** وليست كلمة مرور أو DNS.

يحتوي `prisma/schema.prisma` على `twoFactorSecret` و`twoFactorEnabled`، وتحتوي migration `20260914110000_add_push_security/migration.sql` على أوامر `ADD COLUMN IF NOT EXISTS` لهذه الأعمدة. أُضيف `npx prisma migrate deploy` إلى `vercel.json` قبل `npm run build`، بحيث تُطبّق migrations المتراكمة في مرحلة build قبل تشغيل Serverless. لم تُنفّذ migration مباشرة من البيئة المحلية ولم تُعرض أي قيمة سرية.

نجحت بوابات التحقق المحلية بعد التعديل: Prisma validate، typecheck، typecheck:packages، اختبارات server، اختبارات auth، اختبارات الواجهة، build، وgit diff check. التغيير محفوظ محلياً فقط بانتظار موافقة نشر منفصلة لأن build سيجري migration على قاعدة الإنتاج.
