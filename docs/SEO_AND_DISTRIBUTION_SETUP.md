# إعداد SEO والتوزيع الخارجي

## الحالة الحالية

تم تجهيز metadata وOpenGraph وTwitter Card وWebSite JSON-LD ومسارات sitemap الديناميكية و`robots.txt` داخل المشروع. كما أضيفت خدمة توزيع محتوى تعمل بوضع **draft-only** ولا تنشر إلى أي منصة خارجية تلقائياً.

## Google Search Console

1. أضف property للنطاق `https://borsatyai.com` في Google Search Console.
2. استخدم تحقق DNS TXT لدى مسجل النطاق، ثم خزّن قيمة التحقق في متغير بيئة غير متعقب عند الحاجة.
3. أرسل `https://borsatyai.com/sitemap.xml` و`https://borsatyai.com/sitemap-blog.xml` و`https://borsatyai.com/sitemap-stocks.xml`.
4. راقب أخطاء الفهرسة والصفحات المكررة وcanonical.

## Analytics وTag Manager

فعّل `VITE_GA_MEASUREMENT_ID` و`GOOGLE_TAG_MANAGER_ID` فقط بعد اعتماد سياسة الخصوصية وملفات الارتباط المناسبة. لا تُضمّن مفاتيح أو IDs حقيقية في المستودع.

## التوزيع الخارجي

يستقبل `/api/marketing/distribution/draft` محتوى المقال وينشئ نسخة ذات canonical URL إلى بورصتي. القنوات المهيأة هي Medium وLinkedIn وTwitter/X والمنصات العربية، لكن النشر يتطلب مراجعة بشرية وموصلات ومفاتيح مفعلة. لا توجد عملية نشر تلقائي أو جدولة خارجية في هذه المرحلة.
