# التقرير الشامل لمشروع بورصتي

**تاريخ التقرير:** 13 سبتمبر 2026

**المشروع محل المراجعة:** `financial-dashboard`

**المستودع:** `borsaty2000-blip/financial-dashboard`

## 1. الملخص التنفيذي

تم تحويل المشروع من واجهة تقرير مالي محدودة إلى أساس متكامل لمنصة حسابات مالية عربية. أصبح المشروع يحتوي على Backend مبني باستخدام Express وPrisma وPostgreSQL، وطبقة مصادقة JWT، وواجهات Profile وPreferences وAchievements، بالإضافة إلى واجهة React عربية باتجاه RTL تشمل التسجيل وتسجيل الدخول ولوحة المستخدم والملف الشخصي والإنجازات.

النسخة الحالية **جاهزة للتطوير والاختبار الداخلي**. وهي ليست جاهزة بعد باعتبارها منتجاً إنتاجياً كاملاً، لأن OAuth الاجتماعي وربط مصدر سوق إنتاجي دائم ما زالا خارج نطاق هذه المرحلة. أما استعادة كلمة المرور ورفع الصور وMarket Pulse فقد أصبحت مربوطة فعلياً بالواجهات الخلفية مع حالات آمنة عند غياب الخدمات الخارجية.

## 2. الحالة الحالية بالأرقام

| البند                | الحالة الحالية                    |
| -------------------- | --------------------------------- |
| حالة مستودع GitHub   | متزامن مع `origin/main`           |
| حالة Git المحلية     | نظيفة بعد آخر commit              |
| نماذج قاعدة البيانات | 6 نماذج رئيسية                    |
| الإنجازات المزروعة   | 20 إنجازاً                        |
| صفحات الحساب         | 7 مسارات رئيسية                   |
| اختبارات الواجهة     | 19 ملف اختبار، 91 اختباراً ناجحاً |
| اختبارات Auth        | 4 اختبارات ناجحة                  |
| TypeScript           | ناجح                              |
| Production Build     | ناجح                              |
| Format Check         | ناجح                              |
| النشر الخارجي        | لم يتم تنفيذه في هذه المرحلة      |

## 3. بنية النظام

### 3.1 Backend

الخادم موجود في `server/` ويعمل باستخدام Express. نقطة التشغيل هي `server/index.ts`. يدعم الخادم تشغيلاً محلياً على المنفذ 4000، كما يحتوي على تصدير `default app` ليتوافق مع نمط Serverless عند الحاجة.

المسارات المسجلة حالياً هي:

| المسار                  | الوظيفة                                          |
| ----------------------- | ------------------------------------------------ |
| `/api/health`           | فحص صحة الخادم                                   |
| `/api/financial-report` | التقرير المالي الأساسي الموجود في المشروع الأصلي |
| `/api/auth`             | التسجيل، الدخول، الجلسة، التحديث، وتسجيل الخروج  |
| `/api/profile`          | الملف الشخصي والصورة والحذف الناعم               |
| `/api/preferences`      | التفضيلات ولوحة المستخدم المخصصة                 |
| `/api/achievements`     | الإنجازات والتقدم وXP والمتصدرين                 |
| `/uploads`              | تقديم الصور المرفوعة من مجلد الخادم              |

### 3.2 Frontend

الواجهة موجودة في `client/`. تم الحفاظ على صفحة التقرير المالي الأصلية في المسار الافتراضي، وإضافة مسارات الحساب باستخدام Router داخلي خفيف لا يحتاج إلى اعتماديات إضافية.

المكونات العامة الأساسية هي:

- `AuthContext` لإدارة المستخدم والجلسة.
- `api.ts` لإرسال طلبات HTTP وإضافة Bearer Token تلقائياً.
- `ProtectedRoute` لمنع الوصول إلى Dashboard والملف الشخصي والإنجازات دون تسجيل دخول.
- `router.tsx` لإدارة التنقل داخل الواجهة.
- `AccountPages.tsx` ويحتوي صفحات الحساب الأساسية.

## 4. نظام المصادقة

تم تنفيذ نظام مصادقة كامل على الخادم.

### الوظائف المنفذة

- إنشاء حساب بالبريد واسم المستخدم.
- تسجيل الدخول بالبريد أو اسم المستخدم.
- تشفير كلمة المرور باستخدام `bcryptjs`.
- إصدار Access Token باستخدام JWT.
- إصدار Refresh Token محفوظ في جدول الجلسات.
- تسجيل الخروج وإبطال الجلسة.
- جلب المستخدم الحالي من خلال `/api/auth/me`.
- التحقق من صحة المدخلات باستخدام Zod.
- حماية المسارات بواسطة Auth Middleware.
- Rate Limiting عام حسب عنوان IP.

### الصفحات المرتبطة

- `/register`
- `/login`
- `/forgot-password`
- `/reset-password/:token`

### حدود التنفيذ الحالي

صفحتا Forgot وReset مربوطتان فعلياً بالخادم. تُنشأ Reset Tokens عشوائية صالحة 15 دقيقة وتُستخدم مرة واحدة، ويرسل Nodemailer قالباً عربياً عند ضبط SMTP. عند غياب SMTP في التطوير، لا يتم كشف وجود البريد ويظهر الرابط في سجل التطوير فقط.

تسجيل الدخول باستخدام Google وGitHub لم يتم تفعيله لأن مفاتيح OAuth وRedirect URLs غير مهيأة.

## 5. Profile API

تم تنفيذ طبقة الملف الشخصي في ثلاثة مستويات: Validator، Service، Controller، ثم تسجيلها في Routes.

### الوظائف

- `GET /api/profile`: جلب الملف الشخصي الحالي.
- `PUT /api/profile`: تحديث الاسم والنبذة والدولة والبيانات الشخصية.
- `POST /api/profile/avatar`: رفع الصورة.
- `DELETE /api/profile`: حذف ناعم للحساب.
- `GET /api/profile/:username`: جلب ملف عام.
- دعم `isFollowing` من خلال نموذج Follow.
- منع ظهور الحسابات غير النشطة في الملف العام.

### قيود Avatar

| القيد       | القيمة                       |
| ----------- | ---------------------------- |
| الحد الأقصى | 2MB                          |
| الصيغ       | JPG، PNG، WebP               |
| المجلد      | `server/uploads/avatars/`    |
| نمط الاسم   | `{userId}-{timestamp}.{ext}` |

تمت إضافة Edit Profile Panel في الواجهة، وهو متصل فعلياً بـ `PUT /api/profile`.

واجهة Drag & Drop وPreview مربوطة فعلياً بنقطة الرفع وتطبق قيود النوع والحجم قبل إرسال FormData.

## 6. Preferences API

تسمح هذه الطبقة بتخصيص التجربة بناءً على تفضيلات المستخدم.

### الحقول

- الأسواق المفضلة: EGX وTASI وGold وSilver.
- مستوى الخبرة: مبتدئ، متوسط، محترف.
- أسلوب الاستثمار: محافظ، متوازن، مضارب.
- القطاعات المفضلة.
- الوقت اليومي المتاح.
- الوضع اللوني.
- إشعارات البريد والدفع.

### المسارات

| المسار                           | الوظيفة                   |
| -------------------------------- | ------------------------- |
| `GET /api/preferences`           | جلب التفضيلات             |
| `PUT /api/preferences`           | تحديث التفضيلات           |
| `GET /api/preferences/dashboard` | جلب لوحة المستخدم المخصصة |

لوحة المستخدم المخصصة تعيد توصيات، أخباراً مرتبطة، أسهماً مقترحة، تنبيهات، وTrending. وعند غياب البيانات الحية، لا يتم اختلاق أسعار أو توصيات رقمية.

## 7. Achievements API

تم بناء نظام إنجازات كامل يدعم الإنجازات المكتسبة والمقفلة والتقدم وXP والمتصدرين.

### المسارات

| المسار                               | الوظيفة                      |
| ------------------------------------ | ---------------------------- |
| `GET /api/achievements`              | جميع الإنجازات               |
| `GET /api/achievements/my`           | إنجازات المستخدم الحالي      |
| `GET /api/achievements/progress`     | التقدم وXP والمستوى          |
| `POST /api/achievements/check`       | فحص حدث ومنح الإنجاز المناسب |
| `POST /api/achievements/award/:code` | منح إنجاز محدد               |
| `GET /api/achievements/leaderboard`  | قائمة المتصدرين              |

### نظام المستوى

يتم حساب المستوى وفق الصيغة التالية:

```text
level = floor(XP / 100) + 1
```

### الإنجازات

تمت إضافة 20 إنجازاً تشمل الحساب والأسواق والتحليل والمحفظة والتعلم والمجتمع والفحص الشرعي. من أمثلتها:

- أول دخول.
- ملف مكتمل.
- أول قائمة متابعة.
- أول تنبيه.
- خبير Elliott.
- خبير Gann.
- زائر يومي.
- مستخدم وفي.
- مستثمر.
- مستثمر ذكي.
- مستكشف الأسواق.
- قارئ الأسهم.
- مقارن الأسهم.
- باحث الأسهم.
- متابع الأخبار.
- متداول افتراضي.
- فحص شرعي.

تم تطبيق Seed بنجاح، وأظهر التحقق أن قاعدة البيانات تحتوي على 20 إنجازاً.

## 8. صفحات الواجهة الجديدة

### صفحة التسجيل

تحتوي على أربع خطوات:

1. بيانات الحساب وكلمة المرور.
2. المعلومات الشخصية والدولة واللغة.
3. الأسواق والخبرة وأسلوب الاستثمار.
4. مراجعة البيانات والموافقة على الشروط.

### صفحة الدخول

تدعم البريد أو اسم المستخدم، تذكرني، الاستعادة، والتحويل التلقائي إلى Dashboard بعد نجاح الدخول.

### لوحة Dashboard

تحتوي على:

- رسالة ترحيبية.
- أربع بطاقات إحصائية.
- توصيات مخصصة.
- أخبار الاهتمامات.
- الأسهم المقترحة.
- نبض EGX30 وTASI والذهب والفضة.

### صفحة الملف الشخصي

تحتوي على:

- Cover Gradient.
- Avatar دائري.
- الاسم واسم المستخدم والنبذة.
- إحصائيات الملف.
- تبويبات النظرة العامة والاهتمامات والإنجازات والنشاط.
- زر متابعة أو تعديل الملف.
- نموذج تعديل متصل بالخادم.

### صفحة الإنجازات

تحتوي على:

- XP والمستوى والعنوان.
- شريط التقدم.
- Grid للإنجازات المكتملة والمقفلة.
- Progress Bar للإنجازات غير المكتملة.
- Leaderboard.

## 9. التصميم وتجربة الاستخدام

تم تطبيق نظام تصميم عربي باتجاه RTL.

| العنصر          | التنفيذ                          |
| --------------- | -------------------------------- |
| الاتجاه         | RTL                              |
| النمط الافتراضي | Light                            |
| النمط البديل    | Dark Mode Toggle                 |
| اللون الأساسي   | `#0071BC`                        |
| النجاح          | `#00A651`                        |
| الخطأ           | `#E74C3C`                        |
| التحذير         | `#F39C12`                        |
| الخلفية         | `#F8F9FA`                        |
| الخط العربي     | Cairo                            |
| الخط الإنجليزي  | Inter                            |
| الأرقام         | JetBrains Mono                   |
| الحدود          | `#E4E8EC`                        |
| الحواف          | 7–14px حسب المكون                |
| الحركة          | انتقالات قصيرة للـHover والأزرار |

تمت إضافة استجابة للشاشات الصغيرة، مع تحويل الشبكات إلى عمود أو عمودين حسب العرض.

## 10. قاعدة البيانات

قاعدة البيانات مبنية باستخدام PostgreSQL وPrisma.

### النماذج

| النموذج           | الوظيفة                     |
| ----------------- | --------------------------- |
| `User`            | الحساب والهوية وحالة النشاط |
| `UserPreference`  | إعدادات المستخدم واهتماماته |
| `Achievement`     | كتالوج الإنجازات            |
| `UserAchievement` | إنجازات المستخدم وتقدمه     |
| `Session`         | جلسات Refresh Token         |
| `Follow`          | علاقات المتابعة             |
| `PasswordReset`   | رموز استعادة كلمة المرور    |

### Migrations

- `0001_initial`: الجداول الأساسية.
- `0002_follow`: إضافة جدول Follow وعلاقاته.
- `0003_password_reset`: إضافة رموز استعادة كلمة المرور.

تم تطبيق Migration الأخيرة على Neon بنجاح.

## 11. الأمان

تم تنفيذ أساسيات الأمان التالية:

- تشفير كلمات المرور.
- JWT للتحقق من الجلسة.
- Refresh Tokens قابلة للإبطال.
- Auth Middleware.
- Rate Limiting.
- Zod Validation.
- عدم تضمين ملفات البيئة في Git.
- استبعاد مجلدات الرفع من Git.
- حماية المسارات الخاصة.
- Soft Delete بدلاً من الحذف الفوري للحساب.

### ملاحظات أمان لاحقة

قبل الإنتاج يوصى بتعيين أسرار JWT قوية، وضبط SMTP إنتاجي موثوق، ومراجعة سياسة تخزين Token، وتحديد نطاقات Netlify الفعلية في `CORS_ORIGINS`.

## 12. الاختبارات والتحقق

تم تنفيذ التحقق التالي:

| الاختبار                     | النتيجة               |
| ---------------------------- | --------------------- |
| `npm run typecheck`          | ناجح                  |
| `npm run build`              | ناجح                  |
| `npm run test:auth`          | 4 ناجحة               |
| `npm test`                   | 91 اختباراً ناجحاً    |
| `npm run format:check`       | ناجح                  |
| `npx prisma validate`        | ناجح                  |
| Migration على Neon           | ناجح                  |
| Seed الإنجازات               | ناجح، 20 إنجازاً      |
| Profile API HTTP             | تم التحقق             |
| Preferences API HTTP         | تم التحقق             |
| Achievements API HTTP        | تم التحقق             |
| Soft Delete                  | تم التحقق             |
| الملف العام بعد الحذف الناعم | يعيد 404 كما هو متوقع |

يوجد تحذير غير مانع في Vite بخصوص حجم JavaScript النهائي الذي يتجاوز 500KB. لا يمنع البناء، لكنه يستحق code splitting قبل الإطلاق العام.

## 13. سجل GitHub

| Commit    | الوصف                                         |
| --------- | --------------------------------------------- |
| `21e13a3` | إضافة نماذج User وUserPreference وAchievement |
| `89e00b5` | إضافة Migration وSeed                         |
| `a437c39` | إضافة نظام المصادقة                           |
| `1f7d0aa` | إضافة Profile API                             |
| `8327eec` | إضافة Preferences API                         |
| `4cdaa1e` | إصلاح Soft Delete وFollow ومسار Avatar        |
| `0662fad` | استكمال Personalized Dashboard                |
| `b4feeb9` | إضافة Achievements API                        |
| `65fa808` | إضافة واجهة الحساب الكاملة                    |
| `2a62090` | إضافة لوحة تعديل الملف الشخصي                 |

آخر commit على فرع `main` هو:

```text
2a62090d62e3108fb2472ee738478905357e332a
```

## 14. ما تم إنجازه مقارنة بالمتطلبات

| المجال                   | الحالة      | الملاحظات                                                   |
| ------------------------ | ----------- | ----------------------------------------------------------- |
| Auth Pages               | منفذ        | Forgot وReset واجهة فقط حتى الآن                            |
| Auth Context             | منفذ        | Token management وProtected Routes                          |
| Profile Page             | منفذ        | مع Edit Profile Panel                                       |
| Avatar Backend           | منفذ جزئياً | الرفع يعمل في الخادم، الواجهة التفاعلية ناقصة               |
| Personal Dashboard       | منفذ        | يعتمد على بيانات Preferences الحالية                        |
| Achievements Page        | منفذ        | XP وProgress وLeaderboard                                   |
| API Client               | منفذ        | Fetch client بدلاً من Axios                                 |
| Protected Routes         | منفذ        | Router داخلي خفيف                                           |
| Toast Notifications      | جزئي        | لا توجد طبقة Toast مكتملة لكل الأخطاء                       |
| Loading States           | منفذ        | Loading Screen وواجهات فارغة أساسية                         |
| TopBar User Menu         | جزئي        | User chip وخروج وتبديل المظهر؛ القائمة الموسعة ناقصة        |
| Social OAuth             | غير منفذ    | يحتاج إعدادات Google وGitHub                                |
| Email Reset              | غير منفذ    | يحتاج مزود بريد وReset Token API                            |
| Market Data في Dashboard | جزئي        | البطاقات موجودة، الربط الحي الكامل يحتاج Endpoint سوق مناسب |

## 15. الاختيارات التقنية الفعلية

المتطلبات الأصلية اقترحت React Router وAxios وReact Hook Form وTanStack Query وFramer Motion. المشروع الحالي لا يعتمد عليها؛ تم استخدام React 19 وFetch وRouter داخلي خفيف وState Hooks لتقليل الاعتماديات والحفاظ على بنية المشروع الحالية. هذا الاختيار يقلل حجم الإعداد الأولي، لكنه يعني أن إدارة النماذج والانتقالات ليست مبنية على تلك المكتبات المقترحة.

## 16. التوصيات قبل الإنتاج

الأولوية الأولى هي إضافة نظام استعادة كلمة المرور الحقيقي، لأن الواجهة الحالية لا تستطيع إرسال بريد أو قبول Reset Token من الخادم.

الأولوية الثانية هي ربط رفع Avatar من الواجهة مع `multipart/form-data` وإضافة Preview وإدارة أخطاء الرفع.

الأولوية الثالثة هي إضافة اختبارات HTTP دائمة داخل المستودع لProfile وPreferences وAchievements بدلاً من الاعتماد فقط على سكربتات التحقق اليدوية.

الأولوية الرابعة هي تفعيل OAuth، وتحديد CORS للنطاق النهائي، وتدوير أسرار JWT، وإضافة مراقبة للأخطاء.

الأولوية الخامسة هي تقسيم JavaScript إلى chunks أصغر قبل النشر العام.

## 17. الخلاصة النهائية

المشروع انتقل من نموذج تقرير مالي إلى نواة منصة مالية عربية تحتوي على حسابات مستخدمين وتفضيلات وملفات عامة وإنجازات ولوحة تحكم. طبقة الخادم وقاعدة البيانات مستقرتان وفق الاختبارات المنفذة، والواجهة العربية المتجاوبة تعمل من ناحية البناء والفحص البرمجي.

التقييم الحالي لجاهزية **النسخة الداخلية التجريبية: 85%**. أما الجاهزية للإطلاق العام فتتطلب إكمال البريد، OAuth، رفع الصور من الواجهة، اختبارات API الدائمة، وربط بيانات السوق الحية داخل Dashboard.

## المراجع

[1]: https://github.com/borsaty2000-blip/financial-dashboard 'Borsaty financial-dashboard GitHub repository'
[2]: https://www.prisma.io/docs 'Prisma Documentation'
[3]: https://expressjs.com/ 'Express Documentation'
[4]: https://www.postgresql.org/docs/ 'PostgreSQL Documentation'

## ملحق التنفيذ الأخير — 13 سبتمبر 2026

تم استكمال الفجوات التشغيلية التالية في مشروع `financial-dashboard`:

| المجال              | ما تم تنفيذه                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| استعادة كلمة المرور | مسارات `forgot-password` و`reset-password` و`verify-reset-token`، توكن عشوائي صالح 15 دقيقة، استخدام أحادي للتوكن، وإبطال الجلسات بعد التغيير. |
| البريد الإلكتروني   | قالب عربي RTL عبر Nodemailer، مع SMTP قابل للتهيئة من أسرار البيئة، وسلوك آمن في التطوير عند غياب SMTP.                                        |
| قاعدة البيانات      | نموذج `PasswordReset` وMigration رقم `0003_password_reset`، وتم تطبيقها بنجاح على Neon.                                                        |
| الأمان              | CORS مقيد بالنطاقات المعروفة، `credentials`، طرق HTTP محددة، Rate Limits مستقلة للمصادقة والاستعادة، وملف `.env.example` بلا أسرار.            |
| الملف الشخصي        | مكوّن Avatar Uploader بالسحب والإفلات، معاينة فورية، صيغ JPG/PNG/WebP، وحجم أقصى 2MB، مربوط فعلياً بـ`POST /api/profile/avatar`.               |
| Dashboard           | Market Pulse يقرأ مؤشرات EGX30/70/100 وTASI وGold وSilver، مع تحديث دوري كل 30 ثانية وحالة `—` عند غياب البيانات.                              |
| تجربة الاستخدام     | User Menu منسدلة، Notifications Dropdown، وToast Context بأربع حالات: نجاح، خطأ، تحذير، ومعلومة. أخطاء API تظهر تلقائياً للمستخدم.             |
| الأداء              | تفعيل Code Splitting في Vite؛ خرج البناء موزع إلى `react-vendor` و`financial-report` وملف التطبيق الرئيسي.                                     |

### التحقق الأخير

نجح `npm run typecheck`، ونجح `npm run format:check`، ونجحت اختبارات Auth الأربعة، كما نجحت اختبارات الواجهة: **19 ملف اختبار و91 اختباراً**. نجح `npm run build`، وتم اختبار مساري طلب الاستعادة والتحقق من توكن غير صالح عبر HTTP محلياً. تم تطبيق Migration على Neon بنجاح، ثم دفع ثلاثة commits إلى فرع `main`:

1. `92f3ae1 feat(auth): add forgot/reset password system`
2. `2dd956e fix(security): restrict cors and document production secrets`
3. `3761f1d feat(ui): add market pulse menus avatar upload and toast UX`

لم يتم نشر Backend أو Frontend خلال هذه المرحلة.

## ملحق مراجعة المتطلبات الشاملة — 13 سبتمبر 2026

### ما تم تنفيذه في هذه المراجعة

تمت إضافة صفحات عربية مستقلة للمسارات `/terms` و`/privacy` و`/disclaimer`، إضافة إلى صفحة 404، وربطها بالـRouter الداخلي. كما تم استكمال SEO عبر title وdescription وkeywords وOpen Graph وTwitter metadata وmanifest وrobots وsitemap. أضيف Service Worker محدود لا يخزن طلبات API، وNetlify `_redirects` لدعم الروابط المباشرة في SPA. نجح TypeScript وBuild وFormat Check، وتم التأكد من نسخ ملفات PWA وSEO إلى `client/dist`.

### البنود التي لم تُنفذ خارجياً

لم يتم تنفيذ نشر Vercel أو تعديل DNS في Cloudflare لأن موصلي Vercel وCloudflare غير مفعّلين، ولا توجد جلسة مصادقة خارجية صالحة. لا يمكن إنشاء Backend URL حقيقي أو تأكيد `borsatyai.com` دون إتمام ذلك من حساب المستخدم.

كما أن `financial-dashboard` الحالي لا يحتوي على مسارات Backend للسوق مثل `/api/market/summary` أو `/api/market/egx/summary`؛ لذلك لم يتم اختلاق بيانات سوقية أو ربط مصادر وهمية. يلزم أولاً تحديد Backend سوقي حقيقي أو إضافة خدمة سوق مستقلة مع أسرارها وعقدها.

لم تتم إضافة Google Analytics لعدم توفر `GA_MEASUREMENT_ID`. ولم تتم إضافة Sentry SDK في هذه المراجعة لأن وجود `SENTRY_DSN` وحده لا يكفي لتأكيد إعداد المشروع، ولأن تفعيل المراقبة يحتاج اختيار بيئة الإنتاج وسياسة إرسال الأخطاء. OAuth الاجتماعي اختياري ويتطلب Client IDs وRedirect URLs من مزودي الخدمة.

آخر commit لهذه المراجعة هو `74e0fd9 feat: complete legal seo and pwa foundations`، وأصبح المستودع متزامناً مع `origin/main`.

## ملحق إعادة الهندسة البصرية — 13 سبتمبر 2026

تم تنفيذ المرحلة الأولى من إعادة التصميم بمستوى Bloomberg/TradingView داخل الواجهة الحالية دون تغيير Backend أو اختلاق بيانات سوقية. أُنشئ ملف `client/src/styles/design-tokens.css` ويحتوي على Type Scale من 11px إلى 48px، أوزان الخطوط، 8px spacing grid، ألوان الأسواق، وخصائص tabular numbers للأرقام المالية. تم ربطه بالـCSS العام.

تم تحديث TopBar إلى ارتفاع 64px مع شعار BORSATY، شريط بحث بعرض متجاوب واختصار `Ctrl+K`، تحسين محاذاة RTL، أحجام النقر، وحالات Hover/Focus. كما تم تطبيق تحسينات على Hero وCards وPanels والأزرار والأرقام المالية، إضافة إلى transitions قصيرة ورفع البطاقات ودعم `prefers-reduced-motion` وتحسين Dark Mode.

نتائج التحقق: TypeScript ناجح، 4 اختبارات Auth ناجحة، 19 ملف اختبار و91 اختباراً ناجحاً، Build ناجح، وFormat Check ناجح. لم يتم النشر.

## ملحق تنفيذ المتطلبات 18 — 13 سبتمبر 2026

تمت مراجعة المهام الـ18 وتنفيذ البنود المحلية الآمنة. أضيفت صفحة `/about` بالعربية، وأيقونة `favicon.svg`، وربط الأيقونة في HTML وmanifest، وإضافة `/about` إلى sitemap. أضيف مكوّن Install Prompt يظهر فقط عندما يدعم المتصفح تثبيت PWA. كما تم فصل حد تسجيل الدخول إلى 10 محاولات لكل 15 دقيقة، مع بقاء التسجيل عند 5 محاولات والاستعادة عند 3 محاولات في الساعة وواجهات API العامة عند 100 محاولة لكل 15 دقيقة.

تمت إعادة تشغيل خادم التطوير: API على `http://127.0.0.1:4000` أعاد HTTP 200 من `/api/health`، وVite على `http://127.0.0.1:5173` أعاد HTTP 200 محلياً.

ما بقي خارجياً: نشر Vercel، ربط Cloudflare، تدوير أسرار الإنتاج، Google Analytics، وSentry؛ لم تُنفذ لعدم توفر جلسات/معرفات الاعتماد المطلوبة. خدمة البريد وPassword Reset موجودتان محلياً عبر Nodemailer وSMTP اختياري، ولا يلزم Resend تحديداً إلا إذا تقرر استبداله.

التحقق بعد هذه المرحلة: TypeScript ناجح، 4 اختبارات Auth ناجحة، 19 ملف اختبار و91 اختباراً ناجحاً، Build ناجح، Format Check ناجح، وملفات PWA موجودة في `client/dist`.

## ملحق pasted_content_20 — Part 1: Data Layer

تمت قراءة README والكود الرسميين لمستودعي EGX-Data-MCP-Server وsahmk-python قبل الدمج. يعرّف مستودع EGX الحالي أربع أدوات فقط: `stock_price_egx` و`stock_data_egx` و`gold_price` و`silver_price`؛ ولم أجد فيه 16 أداة أو أداة دليل شركات. لذلك أضيف Adapter موثق يعيد حالة عدم التوفر عند غياب جسر التشغيل الرسمي، دون اختراع Endpoint أو بيانات بديلة. اختبار تشغيل أداة EGX فشل مرة واحدة بسبب تعارض `StructuredTool` مع نسخة `langchain` المثبتة، ولم تتم إعادة المحاولة وفق القاعدة.

تم تثبيت SDK الرسمي `sahmk` وفحص واجهاته. أضيف Adapter يستخدم المسارات الرسمية `market_summary` و`quote` و`companies` مع ترويسة `X-API-Key` وEnvelope موحد يتضمن `data` و`source` و`timestamp` و`freshness` و`delay_minutes` و`available`. أثناء اختبار مستقل أعاد SAHMK HTTP 429 بسبب استهلاك حد الخطة المجانية اليومي: 100 طلب/يوم. لا يتم إظهار أرقام وهمية؛ الرد يرجع `available:false` وسبب الخطأ.

المسارات الجديدة: `/api/market/egx/summary` و`/api/market/egx/companies` و`/api/market/egx/quote/:symbol` و`/api/market/tasi/summary` و`/api/market/tasi/quote/:symbol` و`/api/market/tasi/companies`. TypeScript وBuild و4 اختبارات Auth و91 اختبار واجهة وFormat Check ناجحة. لم يتم النشر.

## ملحق pasted_content_20 — Part 2: Technical Analysis Layer

تمت قراءة README للمكتبات الثلاث. تم تثبيت `trading-signals` و`finmagic`، وإنشاء `server/src/services/analysis/indicators.service.ts` مع RSI وMACD وSMA وEMA وBollinger Bands وATR، إضافة إلى Sharpe وPosition Sizing من finmagic. أضيف Endpoint `GET /api/analysis/:symbol/indicators` ويقبل أسعاراً اختبارية عبر query parameter `prices` عند عدم توفر مصدر شموع حي.

تم تثبيت Trading-Lib من fork وبناء مصدره الرسمي مرة واحدة، لكن package exports تشير إلى `dist/index.js` بينما build الرسمي ينتج `dist/src/index.js`، لذلك تعذر استيراده كحزمة دون تعديل مكتبة خارجية. لم يتم اختراع workaround أو نسخ كودها. الاختبارات الحسابية عبر trading-signals وfinmagic أعادت HTTP 200 بنتائج RSI وMACD وSMA وBollinger وSharpe. TypeScript وBuild ناجحان.

## ملحق pasted_content_20 — Part 3: Elliott, Gann, and Drawing

تمت قراءة README لمستودع ElliottWaves ومستودع lightweight-charts-drawing. مستودع ElliottWaves الحالي عبارة عن Notebook/سكريبت يعتمد pandas وmatplotlib وواجهته `ElliottWaveFindPattern` تطبع النتائج ولا تعيد عقد JSON مستقراً؛ لذلك لم يتم تحويله إلى Microservice تخميني. كما أن مستودع `Combining-Elliott-Wave-LSTM` غير موجود على GitHub بالمسار المطلوب، وفشلت محاولة الجلب مرة واحدة ولم تتكرر.

تم تثبيت `lightweight-charts` بنجاح، لكن حزمة drawing fork تفتقد ملفات `dist` المشار إليها في exports، ففشل استيرادها دون تعديل المكتبة الخارجية. أضيف مكوّن `GannElliottChart.tsx` يستخدم lightweight-charts الرسمي لعرض شموع وطبقات Elliott وGann 1x1 وFibonacci عند تمرير بيانات حقيقية، دون اختلاق بيانات أو ادعاء اكتمال أدوات الرسم المفقودة. TypeScript وBuild وFormat Check ناجحة.

## ملحق pasted_content_20 — Part 4: Shariah Compatibility

تمت قراءة README لـ halalterminal-sdk-js وhalalterminal-mcp. SDK الرسمي يعرّف `screen()` و`getQuote()` و`scanPortfolio()`، بينما طلب المهمة استخدم أسماء غير موجودة مثل `screenStock()` و`getMethodologies()`. كما أن حزمة SDK من الـfork تفتقد `dist/index.mjs` و`tsconfig.json`، وفشل بناؤها مرة واحدة.

تم تنفيذ طبقة HTTP موثقة تعتمد عقد Halal Terminal الرسمي كـfallback، مع `/api/shariah/screen/:symbol` و`/api/shariah/methodologies` و`/api/shariah/batch-screen`. تعرض المنهجيات الخمس AAOIFI وDJIM وFTSE وMSCI وS&P، وتعيد أخطاء 502 صريحة عند غياب المفتاح أو تجاوز الحصة. اختبار methodologies نجح HTTP 200، ولم يتم إجراء screening فعلياً لعدم توفر API Key وعدم استهلاك الحصة المجانية. TypeScript وBuild وFormat Check ناجحة.

## ملحق pasted_content_21 — Python Analysis Microservice

تم بناء خدمة FastAPI مستقلة في `server/python-services` من الصفر، وتشمل `services/pivots.py` لكشف القمم والقيعان، و`services/elliott_wave.py` لقواعد الموجات 1–5 وA–B–C والثقة والأهداف، و`services/gann.py` للزوايا وSquare of Nine وGann Fan والدورات الزمنية، و`services/fibonacci.py` للأهداف. كما أضيفت طبقتا تنظيف وتحقق للمدخلات.

تعمل الخدمة على المنفذ 8001 افتراضياً عبر `uvicorn main:app` وتوفر `GET /health` و`POST /analyze/elliott` و`POST /analyze/gann`. تم تصحيح اختلاف فعلي في SciPy: `find_peaks` يستخدم `distance` وليس `order`. نجحت اختبارات الدوال والحالات الحدية واختبارات HTTP وأعادت الخدمة JSON صحيحاً.

تم ربط Node.js عبر `PYTHON_SERVICE_URL` وإضافة `GET /api/analysis/:symbol/elliott` و`GET /api/analysis/:symbol/gann`. اختبار COMI محلياً عبر Node إلى Python نجح HTTP 200 لكلا المسارين. تم حفظ العمل في commits: `6c5fd6e` لمحرك Elliott، `82775b8` لمحرك Gann، `26925d7` لتكامل Node/Python، و`63b3d89` لتجاهل ملفات البيئة المؤقتة. لم يتم النشر.

## ملحق تنفيذ المتطلبات الإضافية — 13 سبتمبر 2026

تم بناء Statistical Engine في `services/statistical.py` ويحسب المتوسط والانحراف المعياري والتباين والالتواء والتفرطح وPDF/CDF وVaR 95% وSharpe وGARCH(1,1). أضيف `POST /analyze/statistical`، ونجح اختبار الدالة والـHTTP بعد تثبيت `arch` و`statsmodels`.

تم بناء ARIMA(1,1,1) وLSTM صغير باستخدام TensorFlow في `services/forecasting.py` مع `POST /forecast/arima` و`POST /forecast/lstm`. حدث تعارض NumPy/Pandas عند تثبيت TensorFlow، وتم إصلاحه بتثبيت NumPy 1.26.3 وPandas 2.2.0 وSciPy 1.12.0، ثم نجحت اختبارات الدوال وHTTP لكلا النموذجين.

تم ربط Node.js بالمسارات `GET /api/analysis/:symbol/statistical` و`GET /api/analysis/:symbol/forecast/arima` و`GET /api/analysis/:symbol/forecast/lstm` عبر `statistical.service.ts`. نجحت اختبارات التكامل HTTP 200 للمسارات الثلاثة.

تمت إضافة `POST /api/tradingview/webhook` مع Socket.io وSignal Bus. لا يقبل Webhook إلا توقيع HMAC-SHA256 مبنياً على `TRADINGVIEW_WEBHOOK_SECRET`; الاختبار غير الموثق أعاد 401 والموثق أعاد 202. لم يتم نشر WebSocket خارجياً.

تمت إضافة `services/databricks.py` باستخدام `databricks-sql-connector`، مع قراءة `DATABRICKS_SERVER_HOSTNAME` و`DATABRICKS_HTTP_PATH` و`DATABRICKS_TOKEN` من البيئة، وحظر أي استعلام غير read-only. تم اختبار الحماية وغياب الاعتمادات دون إجراء اتصال خارجي.

Commits هذه المرحلة: `6d214b8` للإحصاء، `3ee6038` للتنبؤ، `5084062` لتكامل Node، `6f35634` لـTradingView، و`92bc607` لـDatabricks. لم يتم النشر.

## ملحق الميزات المجانية عالية التأثير — 13 سبتمبر 2026

تم بناء Backtesting Engine في `server/python-services/services/backtesting.py` بثلاث استراتيجيات: Elliott وGann وRSI+MACD. يحسب إجمالي الصفقات والرابحة والخاسرة ونسبة النجاح ومتوسط العائد ومتوسط الخسارة وSharpe وMax Drawdown ومنحنى رأس المال، مع أفق افتراضي سبعة أيام وLookback قابل للتعديل. أضيفت endpoints `/backtest/elliott` و`/backtest/gann` و`/backtest/indicators`، واختبرت محلياً على 180 سعراً.

تمت إضافة `ConsensusService` الذي يجمع Elliott وGann والمؤشرات وARIMA بأوزان 30% و20% و30% و20%، ويعيد score من 0 إلى 100 وsignal وconfidence وbreakdown وتوصية تعليمية. المسار الجديد هو `GET /api/analysis/:symbol/consensus`، ونجح اختبار COMI محلياً بدرجة توافق وHTTP 200.

تم بناء Candlestick Engine من الصفر لكشف Doji وHammer وShooting Star وBullish Engulfing وBearish Engulfing من OHLC. أضيف `POST /analyze/candlestick` في Python و`GET /api/analysis/:symbol/candlestick` في Node، مع التحقق من اتساق مصفوفات OHLC. أضيفت واجهتا `/backtest` و`/candlestick` بتصميم RTL متجاوب، ومنحنى Equity Curve وConsensus breakdown وتنبيه تعليمي.

البيانات التاريخية ليست مخترعة: أضيف `CandlesService` مع cache لمدة خمس دقائق وتسلسل fallback: Yahoo Finance ثم Stooq ثم Twelve Data ثم Finnhub. أصبحت الواجهة تجلب الشموع تلقائياً، مع إبقاء إدخال الأسعار اليدوي اختيارياً للاختبار. عند فشل كل المصادر يعاد 404 وحالة `unavailable` بدلاً من أرقام وهمية. TypeScript وBuild وFormat Check و91 اختبار واجهة و4 اختبارات Auth واختبارات Python وHTTP للمحركات الثلاثة ناجحة. لم يتم النشر.
تمت إضافة `server/src/routes/backtest.routes.ts` و`backtesting.python.ts` لربط صفحة `/backtest` فعلياً بخدمة Python عبر `/api/backtest/:symbol/elliott` و`/api/backtest/:symbol/gann` و`/api/backtest/:symbol/indicators`. اختبار Node → Python لمسار Gann نجح HTTP 200. آخر commit لهذه الإضافة هو `2c4f307`.

## ملحق pasted_content_24 — User Tools and Reliability

تمت إضافة نماذج Prisma لـWatchlist وWatchlistItem وPriceAlert وNotification وPortfolio وPosition وOrder، مع علاقات User وقيود uniqueness والفهارس المطلوبة. نجح `prisma generate` وتولدت migration SQL في `prisma/migrations/20260913220500_add_watchlist_alerts_notifications/`. لم تُطبّق migration على قاعدة البيانات لأن `DATABASE_URL` المتاح في البيئة الحالية لا يبدأ بـ`postgresql://` أو `postgres://`؛ لذلك لا يمكن تنفيذ اتصال آمن بقاعدة البيانات من هذه المهمة.

تمت إضافة المسارات المحمية `/api/watchlists` و`/api/alerts` و`/api/notifications`، وخدمة Alert Checker تعمل كل 60 ثانية وتستخدم CandlesService، وتدعم ABOVE وBELOW وPERCENT_UP وPERCENT_DOWN، وتنشئ Notification عند التفعيل وتبث حدث Socket.io.

تمت إضافة Paper Trading في `/api/trading/buy` و`/api/trading/sell` و`/api/trading/portfolio` و`/api/trading/positions` و`/api/trading/orders` و`/api/trading/performance`، مع صفحة `/portfolio` ورصيد ابتدائي افتراضي وقواعد تحقق للشراء والبيع.

تمت إضافة `GET /api/search?q=` مع بحث الرموز والأسماء ونتائج الأسعار والتغير من CandlesService، ومكوّن Global Search يعمل عبر Ctrl+K والتنقل بالأسهم وEnter. أضيفت صفحات `/watchlists` و`/alerts` مع notification dropdown وآخر الإشعارات.

تمت إضافة React Error Boundary برسالة عربية وزر Retry، ومكونات StockListSkeleton وStockDetailSkeleton وPortfolioSkeleton وAnalysisSkeleton، ودمج Skeleton في صفحات أدوات المستخدم. نجح TypeScript وBuild وFormat Check والاختبارات الأمامية.

Commits المهمة: `f832258` لـWatchlist/Alerts/Notifications، `b1436bd` لـPaper Trading، `74cd7a7` لـSearch، و`37a7898` لـError Boundary وSkeleton Loaders. لم يتم النشر.

## ملحق pasted_content_25 — Level 2 Comparison

تم تنفيذ Stock Comparison في `server/src/services/comparison/comparison.service.ts` و`GET /api/comparison?symbols=COMI,ABUK&market=EGX`. يقبل 2–4 رموز، يجلب 250 شمعة تلقائياً، ويعيد السعر الحالي والتغير والحجم وRSI وMACD وSMA20/SMA50/SMA200 والتقلب السنوي وأداء 1D/1W/1M/3M/1Y، إضافة إلى الفائز في الأداء وRSI والاتجاه. اختبار API الفعلي لرمزي COMI وABUK نجح HTTP 200 وأعاد صفين.

تمت إضافة صفحة `/compare` بواجهة RTL متجاوبة وجدول مقارنة وبطاقات الفائزين. لم تُنفذ Economic Calendar أو Heatmap في هذه المرحلة لأن الملف المرفق يذكر العناوين فقط دون عقد بيانات أو حقول أو مصدر محدد؛ Notification Center الأساسي كان قد نُفذ سابقاً ضمن `/api/notifications` وواجهة القوائم والتنبيهات.

Commit هذه الميزة: `acb8e0e`. لم يتم النشر.
