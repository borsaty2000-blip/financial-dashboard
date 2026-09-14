# ملاحظات مصدر أدلة الأسواق — 14 سبتمبر 2026

تمت مراجعة صفحة Twelve Data الرسمية لبورصة Saudi Exchange: https://twelvedata.com/exchanges/XSAU

تعرّف الصفحة رمز البورصة `XSAU` وMIC code `XSAU`، وتذكر أن تغطية السوق السعودي لدى Twelve Data هي **EOD**، مع جلسة السوق الرئيسية الأحد–الخميس. كما تعرض أن endpoint المرجعي `/stocks` متاح لدليل الرموز. لذلك يُستخدم Twelve Data هنا كـfallback لقائمة أسماء ورموز الأسهم السعودية، ولا تُوصف أسعاره بأنها لحظية.

تؤكد الاستجابة الإنتاجية الحالية أن `/api/market/egx/companies` يعيد 265 شركة من Twelve Data، بينما `/api/market/tasi/companies` كان يعيد `available=false` قبل إضافة fallback XSAU. لا تُعرض أوقات التحديث في الواجهة الجديدة؛ تبقى freshness داخلياً لعقود API واللون فقط في جدول الأسهم.
