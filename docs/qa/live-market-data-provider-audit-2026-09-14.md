# تدقيق مزودي بيانات السوق — 14 سبتمبر 2026

## المصادر التي تم التحقق منها

أعيد اختبار المسارات العامة لخدمة Yahoo Finance مباشرة في 14 سبتمبر 2026. أعادت واجهة chart بيانات صالحة لكل من `^CASE30` لمؤشر EGX30، و`^EGX70EWI.CA` لمؤشر EGX70 EWI، و`^EGX100EWI.CA` لمؤشر EGX100 EWI، و`^TASI.SR` لمؤشر السوق السعودي، و`COMI.CA` لسهم البنك التجاري الدولي، و`2222.SR` لأرامكو، و`GC=F` للذهب، و`SI=F` للفضة. ستُعرض هذه البيانات بوصفها **متأخرة** ولا يجوز وسمها لحظية.

تؤكد صفحة Yahoo Finance أن رموز EGX وTASI منشورة لديها، ومنها [`^CASE30`](https://finance.yahoo.com/quote/%5ECASE30/) و[`^TASI.SR`](https://finance.yahoo.com/quote/%5ETASI.SR/). كما تُظهر نتائجها أن بيانات EGX مؤجلة.

فُحصت وثائق SAHMK الرسمية: [Getting Started](https://www.sahmk.sa/en/developers/docs/getting-started). وهي توثق أن `GET /api/v1/quote/{symbol}/` يعيد `is_delayed`، وأن البيانات التاريخية `GET /api/v1/historical/{symbol}/` تبدأ من خطة Starter؛ كما أن WebSocket متاح من خطة Pro. وبالتالي يقرأ المحول الحقل `is_delayed` ولا يدّعي البث الحي عند عدم توفره.

فُحصت وثائق Twelve Data وفهرس البورصة المصرية [`XCAI`](https://twelvedata.com/exchanges/XCAI). أتاح المفتاح المتصل قراءة دليل يضم **265** ورقة EGX، لكن طلب سعر أو شموع CIB بمعرف `EGS60121C018` أعاد قيداً صريحاً بأن الرمز متاح بدءاً من خطة **Pro أو Venture**. لذلك لا يصح وسم أسعار EGX من هذا المفتاح بأنها لحظية، ويظل Yahoo fallback متأخراً حتى الحصول على ترخيص سوق مناسب.

## قرار التكامل

ترتيب المصادر في الكود هو مزود مرخص متاح أولاً، ثم fallback موثوق متأخر. المصدر لا يخلق قيمة سعرية، ويحمل كل رد `source` و`freshness` و`delay_minutes`. لا تُفعّل `TWELVE_DATA_REALTIME=true` إلا بعد تأكيد أن الاشتراك يتضمن entitlement لحظياً لكل فئة أصل وبورصة مستخدمة.
