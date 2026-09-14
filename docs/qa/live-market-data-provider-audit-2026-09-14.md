# تدقيق مزودي بيانات السوق — 14 سبتمبر 2026

## المصادر التي تم التحقق منها

أعيد اختبار المسارات العامة لخدمة Yahoo Finance مباشرة في 14 سبتمبر 2026. أعادت واجهة chart بيانات صالحة لكل من `^CASE30` لمؤشر EGX30، و`^EGX70EWI.CA` لمؤشر EGX70 EWI، و`^EGX100EWI.CA` لمؤشر EGX100 EWI، و`^TASI.SR` لمؤشر السوق السعودي، و`COMI.CA` لسهم البنك التجاري الدولي، و`2222.SR` لأرامكو، و`GC=F` للذهب، و`SI=F` للفضة. ستُعرض هذه البيانات بوصفها **متأخرة** ولا يجوز وسمها لحظية.

تؤكد صفحة Yahoo Finance أن رموز EGX وTASI منشورة لديها، ومنها [`^CASE30`](https://finance.yahoo.com/quote/%5ECASE30/) و[`^TASI.SR`](https://finance.yahoo.com/quote/%5ETASI.SR/). كما تُظهر نتائجها أن بيانات EGX مؤجلة.

فُحصت وثائق SAHMK الرسمية: [Getting Started](https://www.sahmk.sa/en/developers/docs/getting-started). وهي توثق أن `GET /api/v1/quote/{symbol}/` يعيد `is_delayed`، وأن البيانات التاريخية `GET /api/v1/historical/{symbol}/` تبدأ من خطة Starter؛ كما أن WebSocket متاح من خطة Pro. وبالتالي يقرأ المحول الحقل `is_delayed` ولا يدّعي البث الحي عند عدم توفره.

فُحصت وثائق Twelve Data وفهرس البورصة المصرية [`XCAI`](https://twelvedata.com/exchanges/XCAI). أتاح المفتاح المتصل قراءة دليل يضم **265** ورقة EGX، لكن طلب سعر أو شموع CIB بمعرف `EGS60121C018` أعاد قيداً صريحاً بأن الرمز متاح بدءاً من خطة **Pro أو Venture**. لذلك لا يصح وسم أسعار EGX من هذا المفتاح بأنها لحظية، ويظل Yahoo fallback متأخراً حتى الحصول على ترخيص سوق مناسب.

## قرار التكامل

ترتيب المصادر في الكود هو مزود مرخص متاح أولاً، ثم fallback موثوق متأخر. المصدر لا يخلق قيمة سعرية، ويحمل كل رد `source` و`freshness` و`delay_minutes`. لا تُفعّل `TWELVE_DATA_REALTIME=true` إلا بعد تأكيد أن الاشتراك يتضمن entitlement لحظياً لكل فئة أصل وبورصة مستخدمة.

## Production verification after 7613a37

تم دفع `7613a37` إلى `origin/main` ووصل الإصدار إلى `borsatyai.com`. أعاد `/api/health` حالة 200، وعادت مسارات quote والشموع والمعادن وملخصا EGX وTASI بحالة HTTP 200.

قبل تفعيل المفتاح كان إعداد Vercel يحتوي على `DATABASE_URL` وJWT وCORS وغيرها، ولا يحتوي على `TWELVE_DATA_API_KEY` أو `SAHMK_API_KEY` أو `FINNHUB_API_KEY` أو `POLYGON_API_KEY`. في ذلك القياس استخدم الإنتاج fallback Yahoo Finance المتأخر: السعر المقاس لـCOMI كان 138.17، وسعر 2222 كان 25.66، وكلها موسومة `freshness=delayed`، بينما عاد دليل شركات EGX بحالة `available=false` ورسالة `TWELVE_DATA_API_KEY is not configured`. الأخبار عادت `available=false` بلا أرقام أو أخبار مصطنعة.

هذا يثبت أن التطبيق لا ينهار عند غياب المفاتيح، لكنه لا يثبت البث اللحظي. يلزم إضافة مفاتيح المزودين إلى Vercel Production/Preview عبر قناة أسرار آمنة، ثم إعادة deploy وإعادة اختبار entitlement الفعلي لكل مزود. سيبقى `TWELVE_DATA_REALTIME=false` حتى يثبت المزود أن الاشتراك الحالي يدعم realtime.

## Production verification after Twelve Data activation

بعد إضافة `TWELVE_DATA_API_KEY` إلى Vercel في Production وPreview وإعادة النشر، أصبح `/api/market/egx/companies` يعيد `available=true` و`count=265` من Twelve Data. هذا يؤكد أن المفتاح صالح للوصول إلى دليل EGX.

اختبار المسارات بعد التفعيل أظهر أن `/api/market/egx/summary` يعيد `source=mixed` و`freshness=delayed`، و`/api/market/tasi/summary` يعتمد Yahoo Finance المتأخر لغياب `SAHMK_API_KEY`. كما أن `/api/market/quote/COMI` و`/api/market/candles/COMI` بقيا على Yahoo Finance المتأخر؛ وهذا متوافق مع قيد Twelve Data السابق بأن أسعار/شموع CIB تتطلب خطة Pro أو Venture. لذلك لم يتم تفعيل `TWELVE_DATA_REALTIME` ولم تُوصف الأسعار بأنها لحظية. الذهب أصبح متاحاً من Twelve Data لكنه موسوم متأخراً، والفضة بقيت على Yahoo المتأخر. الأخبار لا تزال `available=false` لغياب مصدر أخبار صالح.

الخلاصة: **دليل EGX يعمل، أما البث اللحظي للأسهم المصرية فيتطلب ترقية/ترخيص مزود مناسب؛ وبيانات TASI اللحظية تتطلب `SAHMK_API_KEY` صالحاً.**
