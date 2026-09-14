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

## ملحق pasted_content_26 — Mobile UX Audit

تم تنفيذ تدقيق Mobile-first عند 320px و375px و428px باستخدام Chromium headless، مع مراجعة إضافية عند 1280px. لم يظهر overflow أفقي في الصفحات المختبرة، وتحوّلت حقول المقارنة ونماذج Backtesting إلى تخطيط عمودي عند 320px، كما تحولت مقارنة الأسهم إلى بطاقات مكدسة بدلاً من جدول عريض على الهاتف.

تمت إضافة نظام Fluid Typography عبر `clamp()`، وأهداف لمس لا تقل عن 44px لعناصر الهاتف، ومسافات آمنة للمحتوى أسفل BottomNav، ومعالجة safe-area السفلية. أضيفت نقاط breakpoint عملية لـ320 و375 و428 و768 و1024 و1440px.

تمت إضافة `MobileChrome` الموحد، ويشمل TopBar للهاتف، BottomNav بخمسة عناصر، زر بحث مركزي، Hamburger Drawer من اليمين المتوافق مع RTL، إغلاق بالنقر خارج القائمة، ومنع تمرير body أثناء فتح Drawer. أضيف دعم Swipe لفتح/إغلاق Drawer وPull-to-Refresh من أعلى الصفحة، مع مؤشر مرئي، إضافة إلى Search Modal بملء الشاشة على الهاتف وفتح من TopBar أو BottomNav أو Ctrl+K.

تم تحسين الرسم `GannElliottChart` لارتفاع 280px على الهاتف مع pinch zoom وhorizontal touch drag وتعطيل mouse-wheel، وتحديث PWA Manifest بإتجاه portrait وshortcuts، وإضافة metadata الخاصة بـiOS وapple-touch-icon وpreconnect.

أثناء التدقيق ظهر خطأ حقيقي `Cannot read properties of null (reading 'useContext')` بعد تثبيت Lucide في الجذر؛ تم تشخيصه كنسختي React مختلفتين، ونُقلت `lucide-react` إلى `client/package.json` ثم أعيد تشغيل Vite، وعاد Home للعمل. هذه المعالجة محفوظة في سجل Git.

الاختبار البصري أظهر أن Home بعرض 375px يبدأ أسفل TopBar وأن BottomNav لا يغطي المحتوى. صفحات Watchlists وAlerts وPortfolio أعادت إلى Login بشكل صحيح عند غياب الجلسة. لم يتم تجاوز المصادقة في اختبار القوائم حمايةً للعقد الأمني. Virtual scrolling لم يُضف لأن الجداول الحالية ليست قائمة ضخمة؛ استخدامه الآن سيضيف تعقيداً دون فائدة مقاسة.

نتائج التحقق: TypeScript ناجح، Build ناجح، Format Check ناجح، و91 اختبار واجهة ناجح. لم يتم النشر. Commits الموبايل: `4b21132`، `4eb90d9`، `1db790c`، `dce91a0`، `1af72d9`، `4bc43dd`.

## ملحق pasted_content_27 — Watchlist + Alerts Completion

تمت مراجعة التنفيذ السابق وإكمال البنود الناقصة بدلاً من إعادة بناء النماذج. نماذج `Watchlist` و`WatchlistItem` و`PriceAlert` و`Notification` موجودة في Prisma مع علاقات User وCascade وUnique constraint وفهارس المستخدم.

تمت إضافة `GET /api/notifications/unread-count`، وتوسيع شروط التنبيه لتشمل `RSI_ABOVE` و`RSI_BELOW` بالإضافة إلى `ABOVE` و`BELOW` و`PERCENT_UP` و`PERCENT_DOWN`. أصبح Alert Checker يجلب 30 شمعة حتى يستطيع حساب RSI، ثم ينشئ Notification مرة واحدة ويوقف التنبيه بعد التفعيل ويبث الحدث عبر Socket.io.

تمت إضافة `GET /api/market/candles/:symbol`، وصفحة `/stock/:symbol` التي تعرض السعر التاريخي المتاح، التغير، أعلى وأدنى قيمة، الحجم، رسم أداء مبسط، وزر `أضف إلى قائمتي`. عند عدم توفر البيانات يظهر تنبيه صريح بدلاً من رقم مختلق. اختبار الصفحة المحمول عند 375px نجح بصرياً دون overflow.

اختبارات API: `/api/health` أعاد 200، وWatchlist وUnread Count أعادا 401 بدون Bearer Token كما هو مطلوب أمنياً، وMarket Candles أعاد 200 مع حالة البيانات المتاحة/غير المتاحة حسب المصدر. TypeScript وBuild وFormat Check و91 اختباراً ناجحة.

تمت محاولة `npx prisma migrate dev --name add_watchlist_alerts`، لكنها توقفت بـPrisma P1012 لأن `DATABASE_URL` الحالي لا يبدأ بـ`postgresql://` أو `postgres://`. لم يتم اختلاق اتصال أو تطبيق migration على قاعدة غير صالحة.

## ملحق pasted_content_28 — AI, Automation, Developer Platform and Mobile Extensions

تم تنفيذ ميزات المرحلة الجديدة محلياً دون نشر خارجي. أضيف محرك Ensemble يضم ARIMA وLSTM وProphet وXGBoost وRandom Forest مع وزن عكسي لـMSE، وثقة موضحة، وبدائل آمنة عند غياب الحزم الاختيارية. أضيف تحليل مشاعر عربي يستخدم نموذج Transformers عند تهيئته، ويعود إلى قاموس عربي محدود ومعلن عند عدم توفر النموذج أو الأخبار. أضيف كشف شذوذ يجمع Isolation Forest وAutoEncoder ويعيد درجة وحالة الشذوذ دون تحويلها إلى توصية.

أضيفت صفحة `/simulator` لمحاكاة الاستثمار التاريخي، وصفحة `/shariah` للفحص الشرعي المتقدم بخمس منهجيات وتطهير توزيعات وشهادة قابلة للتنزيل بصيغة JSON قابلة للأرشفة والطباعة. أضيفت قناة `analysis:stream` إلى Socket.io مع مكوّن `NotificationLive`، وخدمات Smart Portfolio وإعادة التوازن التعليمية، وتقرير أسبوعي محمي، وتوأم رقمي وصفي، ومقارنة عالمية صريحة لا تعرض قيماً غير متوفرة.

أضيفت Developer API keys مع تخزين hash، وإلغاء المفتاح، وعداد الاستخدام، وطلب انضمام المحللين، إضافة إلى Webhooks اختيارية لـWhatsApp وTelegram وواجهة صوتية ترجع نصاً قابلاً للقراءة محلياً عند غياب gTTS. أضيف migration incremental للنماذج `api_keys` و`analyst_profiles`، وملف `requirements-optional.txt` للحزم الثقيلة الاختيارية.

التحقق: `npm run typecheck` ناجح، `npm run build` ناجح، 91 اختبار واجهة ناجحة في 19 ملفاً، واختبارات Python السابقة ناجحة، واختبار HTTP لـEnsemble والمشاعر وكشف الشذوذ ناجح. اختبار Python أكد خمسة نماذج Ensemble، وEndpoint المشاعر أعاد حالة متاحة مع صفر أخبار عند غياب موصل الأخبار بدلاً من اختلاق أخبار. لم يتم النشر الخارجي.

القيود المعروفة: Prophet وXGBoost وTransformers وgTTS اختيارية ولم تُثبّت في بيئة الإنتاج تلقائياً؛ عند غيابها تظهر حالة fallback صريحة. الشهادة الحالية JSON وليست PDF ثنائي؛ يمكن طباعتها إلى PDF من المتصفح، أو إضافة مولد PDF لاحقاً. المقارنة العالمية لا تعرض أرقاماً حتى يتم ربط مصدر موثوق لها. يجب تطبيق migration الجديد في بيئة قاعدة البيانات قبل استخدام Developer API في الإنتاج.

## ملحق pasted_content_29 — Parts 6–15 Completion

تمت مراجعة المتطلبات مقابل التنفيذ الموجود، ثم استكمال الفجوات بدلاً من إعادة بناء الملفات الموجودة. أصبح Part 6 يدعم اشتراكات Socket.io فعلية عبر `live:subscribe` و`live:unsubscribe`، ويشغل بثاً دورياً لتحليل Consensus لكل سهم مشترك، مع واجهة `LiveAnalysisFeed` وحالات خطأ واضحة.

في Part 7 أضيفت ملفات المخاطر `CONSERVATIVE` و`BALANCED` و`AGGRESSIVE`، ومسارات إنشاء Smart Portfolio وجلبه وخطة إعادة التوازن. الخطة افتراضية وغير تنفيذية، وتعرض التوزيع المستهدف والأسهم المقترحة وقيمة المحفظة. أضيفت صفحة `/portfolio/smart`. في Part 8 أضيف Weekly Digest يتضمن أداء المحفظة، الفرص من قائمة المتابعة، المخاطر والتنبيهات، وسجل آخر التقارير، مع صفحة `/weekly-report` و`/reports/weekly` وزر طباعة إلى PDF.

في Part 9 أصبح Digital Twin يحسب متوسط قيمة الشراء، فترة الاحتفاظ التقريبية، معدل النجاح، تحمل المخاطر، القطاعات المفضلة والتوصيات من سجل الأوامر والتفضيلات، مع صفحة `/twin`. في Part 10 أصبحت Global Comparison تجلب المؤشرات المتاحة للفترات 1M و3M و6M و1Y ولا تعرض أرقاماً مفقودة، مع صفحة `/compare/global`.

في Part 11 أضيف `apiKeyAuth` فعلي يعتمد على hash للمفتاح، وحد 60 طلباً لكل دقيقة، وتحديث عداد الاستخدام، ونقطة `/api/v1/quote/:symbol`، ولوحة `/developer/dashboard`. في Part 12 أضيف Analyst Program وملف AnalystProfile واشتراكات المحللين ومسارات القائمة والاشتراك وطلب الاعتماد، مع migrations وصفحات `/analysts` و`/analysts/apply`.

في Part 13 أضيف زر الاستماع للتحليل العربي باستخدام SpeechSynthesis المحلي مع endpoint صوتي آمن عند غياب gTTS. في Part 14 أضيف إرسال WhatsApp عبر Twilio فقط عند توفير المتغيرات المطلوبة، وزر من صفحة التنبيهات. في Part 15 أضيف Telegram webhook على `/api/telegram/webhook` وملف `telegram_bot.py` بالأوامر `/start` و`/analyze` و`/top` و`/alert` و`/portfolio`.

التحقق النهائي: `npm run typecheck` ناجح، `npm run build` ناجح، و91 اختباراً ناجحة. `npx prisma validate` و`npx prisma generate` ناجحان عند إزالة متغير `DATABASE_URL` الموروث غير الصالح من جلسة التشغيل حتى يقرأ Prisma القيمة المحلية الصحيحة من `.env`. اختبارات HTTP أعادت Health 200، والتقارير والمطور وDeveloper API أعادت 401 بدون مصادقة كما هو متوقع، وGlobal Comparison أعاد 200 مع حالة توفر صريحة. لم يتم النشر الخارجي ولم يتم دفع commits إلى origin.

عدد commits Parts 6–15: 10 commits، من `2e28908` حتى `557777d`، إضافة إلى commit نهائي مشترك للواجهة والتوثيق. القيود الخارجية: WhatsApp وTelegram وgTTS وموصل الأخبار تحتاج مفاتيح أو حزم اختيارية؛ Analyst subscriptions تحتاج تطبيق migration على قاعدة الإنتاج قبل الاستخدام.

## ملحق pasted_content_30 — Reliable Data, Fundamentals, Calendar, News, Screener and Portfolio Analytics

تم تنفيذ الأولويات الست بالترتيب المطلوب دون نشر خارجي. في طبقة البيانات أصبحت `CandlesService` تستخدم Twelve Data Pro ثم SAHMK Pro للسوق السعودي ثم Polygon.io ثم Yahoo/Stooq/Finnhub كبدائل، مع كاش 60 ثانية لكل رمز وفترة وسوق، وحفظ ناجح اختياري في جدول `market_candles`. أضيف `getQuote` وendpoint `GET /api/market/quote/:symbol` مع `freshness` و`delayedByMinutes`. أضيف `server/src/sockets/price-stream.ts` وبث `price:update` كل ثانية للأسهم التي اشتركت فعلياً، إضافة إلى hook الواجهة `useLivePrice` ومؤشر Live/Delayed/Cached في صفحة السهم.

أضيف `FundamentalsService` مع مسارات `/api/fundamentals/:symbol` و`/ratios` و`/dividends`. يدعم Finnhub وSAHMK وTwelve Data مع إعادة `—` أو حالة `available:false` عند غياب القيمة، وأضيف قسم البيانات المالية في صفحة تفاصيل السهم مع مؤشرات P/E وEPS والقيمة السوقية والتوزيعات و52 أسبوعاً وقائمة مالية عند توفرها.

أضيف نموذج `EconomicEvent` وmigration وخدمة تقويم يدوي تمتد ستة أشهر لمصر والسعودية والعالمي، مع فلاتر الدولة والأهمية والفئة، ومساري `/api/calendar/events` و`/api/calendar/notify` وصفحة `/calendar`. يوجد fallback يدوي واضح إذا لم تكن migration مطبقة بعد، ولا تُعرض الأحداث على أنها بيانات Trading Economics إلا عند ربط مصدر خارجي.

أضيف `NewsService` بخمسة RSS قابلة للضبط: Mubasher وArgaam وEnterprise والبورصة المصرية وInvesting.com العربي، مع تصنيف اقتصاد/شركات/عام، ربط الرموز داخل العنوان والوصف، ملخص من جملتين، sentiment score وشارة المشاعر. عند تشغيل Python service يستخدم AraBERT/CAMeL model المحدد في `ARABIC_SENTIMENT_MODEL`، وإلا يستخدم fallback قاموسياً معلناً. الواجهة متاحة على `/news` ومسارات `/api/news` و`/api/news/:symbol`.

أضيف `ScreenerService` و25 حقلاً قابلاً للتوسع تشمل P/E وP/B وEPS وROE وRSI وMACD وSMA والقيمة السوقية والحجم والتوزيعات وConsensus، مع `/api/screener/scan` و`/presets` و`/save` و`/alert` وصفحة `/screener`. الفلاتر التي لا تتوفر لها بيانات لا تخترع قيماً؛ تُعامل كقيم غير متاحة ولا تمنع العرض.

أضيف `PortfolioAnalyticsService` وحساب Sharpe وSortino وMax Drawdown وBeta مقابل EGX30 وAlpha والعائد الكلي ومنحنى Equity، مع endpoint محمي `/api/portfolio/analytics` وصفحة `/portfolio/analytics`. عند عدم وجود صفقات مغلقة أو سلسلة EGX30 يعاد `null` بدلاً من رقم مصطنع.

نتائج الاختبار: `npm run typecheck` ناجح، `npm run build` ناجح، و91 اختباراً ناجحة، `python3 -m py_compile` ناجح، و`prisma validate/generate` ناجحان عند إزالة `DATABASE_URL` الموروث غير الصالح من جلسة التشغيل. Health 200، Quote 200، Fundamentals 200 مع حالة توفر صريحة، Calendar 200، News 200، Presets 200، Screener scan 200، وPortfolio Analytics 401 بدون جلسة كما هو متوقع.

القيود: المصدر الحي الحقيقي يتطلب مفاتيح `TWELVE_DATA_API_KEY` و`SAHMK_API_KEY` و`POLYGON_API_KEY`؛ البث كل ثانية لا يعني أن المزود نفسه يرسل tick جديداً كل ثانية، بل يعيد نشر أحدث quote متاح. الأخبار تعتمد على توفر RSS، وAraBERT يتطلب تشغيل خدمة Python وحزمة النموذج، كما يجب تطبيق migrations الثلاث الجديدة على قاعدة الإنتاج قبل الاعتماد على التخزين التاريخي والتقويم والماسح المحفوظ.

## ملحق pasted_content_31 — Specialized Calendars, Additional Markets, Comparison and Governance

تم تنفيذ Part 1 إلى Part 5 بالترتيب المطلوب. أضيفت نماذج Prisma وmigration لتقويم IPO والتوزيعات والنتائج والانقسامات، إضافة إلى InsiderTrade. البيانات اليدوية seed واضحة وموسومة داخلياً كـ fallback، وعددها 12 طرحاً، 12 توزيعاً، 12 نتيجة، و6 انقسامات، مع endpoints للعرض والقادم، ومسار إدارة POST للـIPO محمي بـ`ADMIN_USER_IDS`، وصفحة موحدة بأربع مسارات: `/calendar/ipo` و`/calendar/dividends` و`/calendar/earnings` و`/calendar/splits`، مع عداد تنازلي وتذكير محمي.

في Part 2 أضيفت ForexService بما يزيد على 50 زوجاً و7 أزواج رئيسية، وCommoditiesService بخمس عشرة سلعة ضمن الطاقة والمعادن والزراعة والثمينة، وCryptoService باستخدام CoinGecko لأفضل 50 عملة مع قائمة رموز fallback عند تعذر المزود، وETFService بأربعة صناديق مصرية/سعودية، وBondsService بأربعة إصدارات حكومية مع عدم اختلاق العائد أو السعر. أضيفت صفحات `/markets/forex` و`/markets/commodities` و`/markets/crypto` و`/markets/etf` و`/markets/bonds`.

في Part 3 أضيف CurrencyService باستخدام Frankfurter للتحويل والأسعار التاريخية، endpoint `POST /api/tools/convert` و`GET /api/tools/rates` و`GET /api/tools/historical`، ومكون محول عملات قابل للفتح من التطبيق مع حفظ الأزواج المفضلة محلياً.

في Part 4 أضيفت مقارنة القطاعات والفترات وقائمة المتابعة: `/api/comparison/sectors` و`/api/comparison/periods` و`/api/comparison/watchlist`، وصفحات `/compare/sectors` و`/compare/periods` و`/compare/watchlist`. تحسب المقارنة الأداء من الشموع المتاحة ومتوسط P/E عند توفره، وتعرض null/شرطة عند غياب المصدر.

في Part 5 أضيفت `/api/insider-trades/recent` و`/api/insider-trades/:symbol` و`/api/ownership/:symbol` وقسم الحوكمة إلى صفحة السهم، مع 12 سجلاً fallback للتداولات الداخلية وملكية لا تعرض نسباً غير موثقة عند عدم توفر الإفصاح.

نتيجة اختبار endpoints المحلية: Health 200، IPO 200، IPO upcoming 200، Dividends 200، Earnings 200، Splits 200، Forex 200، Commodities 200، Crypto 200، ETF 200، Bonds 200، Comparison periods 200، Insider recent 200، Ownership 200. Currency rates أعاد 502 في بيئة الاختبار لأن مزود Frankfurter الخارجي لم يكن متاحاً، وتبقى الواجهة تعرض عدم التوفر بدلاً من رقم مصطنع. `npm run typecheck` و`npm run build` و91 اختباراً ناجحة.

Commits المرحلة: `d06ee22` للتقويمات المتخصصة، `5736caa` للأسواق الإضافية، `b2a47c8` لمحول العملات والمفضلة، `91c6b31` للمقارنة الشاملة، و`e54bc6b` للحوكمة والإفصاحات.

## ملحق pasted_content_32 — Global Revenue Features

تم دمج الميزات الخمس المطلوبة بالترتيب. في Part 1 توسعت نماذج `ApiKey` و`ApiUsageLog` و`ApiSubscription` مع حدود FREE/PRO/ENTERPRISE، وتوليد مفاتيح `bors_`، والتحقق عبر `X-API-Key`، وسجل الاستخدام، وحدود يومية، ومسارات `/api/v1/stocks` و`candles` و`analysis` و`market/summary` و`news`. أضيفت صفحة `/developer/dashboard` لعرض المفاتيح والاستخدام والتوثيق، وصفحة `/developer/docs` بأمثلة cURL وJavaScript وPython. namespace Socket.io الفعلي هو `/api/v1/ws/prices` مع بقاء القناة العامة للتوافق.

في Part 2 اكتملت طبقة Analyst Program: التقديم، تعديل الملف، قائمة المحللين، الملف العام، المقالات التحليلية، أنواع المنشورات، المشاعر، المنشورات المدفوعة كحقل، الاشتراك والإلغاء، الاشتراكات الحالية، ولوحات `/analysts/dashboard` و`/my/subscriptions`، بالإضافة إلى خدمة checkout آمنة لا تحصّل أي مبلغ عند غياب Stripe أو PayPal. أضيفت حقول التحقق والتقييم والإيرادات وmigration incremental.

في Part 3 أصبح زر الاستماع في صفحة السهم يستدعي `/api/analysis/:symbol/audio`، ويحاول TTS عربي عبر gTTS من خدمة Python، ثم يعود إلى Web Speech API عند عدم تشغيل Python أو عدم تهيئة gTTS. عدم وجود `PYTHON_SERVICE_URL` أو مزود TTS لا يُخفى؛ يعاد رد صريح بأن الصوت غير متاح.

في Part 4 أضيفت `WhatsAppSubscription`، ومسارات التفعيل والتحقق والحالة والإرسال، وربط Alert Checker بإرسال PRICE بعد تحقق المستخدم. الإرسال الحقيقي يتطلب `TWILIO_ACCOUNT_SID` و`TWILIO_AUTH_TOKEN` و`TWILIO_WHATSAPP_FROM`؛ دونها يعاد 503 واضح ولا يتم الادعاء بإرسال الرسالة.

في Part 5 أضيفت `TelegramSubscription`، وربط webhook بالمحادثات، ومسار `/api/telegram/link`، ومعلومات البوت، وصفحة `/settings/telegram`، ورابط سريع داخل غلاف التطبيق. كما اكتمل Python bot الاختياري بأوامر `/start` و`/help` و`/analyze` و`/top` و`/news` و`/portfolio` و`/alert`. التشغيل الفعلي يتطلب `TELEGRAM_BOT_TOKEN` واسم المستخدم من BotFather.

التحقق: `prisma format` و`prisma validate` و`prisma generate` و`npm run typecheck` و`npm run build` و`python3 -m py_compile` ناجحة. اختبار الخادم المحلي أعاد Health 200، و`/api/v1/stocks` أعاد 401 دون مفتاح كما هو متوقع، وTelegram info 200، وAudio 200 مع fallback، وTelegram webhook 200، وAnalyst list 200. عند عدم توفر `DATABASE_URL` الصحيح يعيد Analyst profile/posts 503 صريحاً بدلاً من إسقاط الخادم. لم يتم النشر الخارجي ولم يتم تحصيل أي مدفوعات.

القيود الخارجية المتبقية: يلزم تطبيق migration `20260914102000_add_global_revenue_features` على قاعدة الإنتاج، وإضافة مفاتيح Twilio وTelegram وStripe/PayPal فقط إذا أراد المستخدم تفعيل تلك الخدمات، كما يجب اعتبار أرقام الاستخدام والتوقعات تعليمية وعدم تقديمها كتوصية استثمارية.

## ملحق pasted_content_33 — Mobile, Push, i18n, PDF and Security

تم تنفيذ Part 1 بإنشاء نماذج `PushSubscription` و`PushNotification` وmigration `20260914110000_add_push_security`. أضيفت Push API للتسجيل والإلغاء والحالة وقائمة الإشعارات، وخدمة `push.service.ts` باستخدام Web Push/VAPID مع تعطيل الاشتراكات المنتهية تلقائياً، وربط Alert Checker والتقرير الأسبوعي بإشعارات Push. أضيف Service Worker يستقبل `push` ويفتح الرابط عند النقر، وصفحة `/settings/notifications` وhook لتفعيل الإشعارات. إعداد Firebase محفوظ اختيارياً عبر `client/src/services/firebase.ts` ومتغيرات البيئة؛ لا توجد أسرار Firebase في المستودع.

تم تنفيذ Part 2 كتطبيق Expo مستقل داخل `BorsatyMobile/`، مع تبويبات Home وMarkets وAnalysis وPortfolio وProfile، وصفحة Stock Detail ديناميكية، API client مع cache دون اتصال، deep linking عبر `borsaty://stock/:symbol`، مشاركة التحليل، Socket.io للأسعار، Expo Notifications، SecureStore، وbiometric login اختياري. `npm run typecheck` لتطبيق الجوال ناجح. لم يتم تنفيذ توقيعات متجر Apple أو Google ولم يتم النشر، لأن ذلك يتطلب حسابات المتاجر وشهادات خارجية.

تم تنفيذ Part 3 بإضافة i18next وReact bindings وكشف اللغة وحفظها في localStorage، وملفات `ar.json` و`en.json` و`fr.json`، ومحول لغة ثابت في الواجهة مع تبديل RTL للعربية وLTR للإنجليزية/الفرنسية، إضافة إلى middleware خادم يقرأ `Accept-Language`.

تم تنفيذ Part 4 بخدمة PDFKit ومسارات حقيقية: `/api/reports/stock/:symbol/pdf` و`/api/reports/portfolio/pdf` و`/api/reports/weekly/pdf`. أضيفت أزرار التحميل في صفحة السهم والمحفظة والتقرير الأسبوعي. اختبار Stock PDF أعاد HTTP 200 و`application/pdf` بحجم 12081 بايت.

تم تنفيذ Part 5 بإضافة حقول 2FA للمستخدم، نموذج `LoginHistory`، خدمة TOTP/QR، وواجهات `/api/security/status` و`/api/security/2fa/setup` و`confirm` و`disable` والجلسات وسجل الدخول. أصبح تسجيل الدخول يطلب رمز TOTP عند تفعيله، مع تسجيل الجلسة الناجحة. أضيفت صفحة `/settings/security` لإدارة 2FA والجلسات والسجل.

نتائج التحقق: `prisma validate` و`prisma generate` و`npm run typecheck` و`npm run build` ناجحة، و91 اختباراً ناجحة، وفحص Python ناجح، وMobile TypeScript ناجح. Health أعاد 200، Push وSecurity أعادا 401 بدون جلسة كما هو صحيح، وStock PDF أعاد 200. لم يتم النشر، ولم يتم تفعيل Firebase أو Twilio أو VAPID أو حسابات المتاجر دون مفاتيح خارجية.

القيود العملية: Web Push يتطلب `VAPID_PUBLIC_KEY` و`VAPID_PRIVATE_KEY` و`VAPID_SUBJECT`، وتطبيق Expo يحتاج `npm install` ثم EAS/Android Studio/Xcode عند البناء الفعلي. 2FA لا يصبح فعالاً للمستخدمين قبل تطبيق migration الجديدة على قاعدة الإنتاج. الترجمة الحالية توفر البنية والمفاتيح الأساسية وتبديل الاتجاه، بينما النصوص التاريخية الصلبة في الصفحات القديمة تحتاج دورة ترجمة لاحقة.

### تصحيح تكاملات Part 1

أضيفت إشعارات Push عند منح إنجاز جديد لأول مرة، وعند نشر محلل معتمد لتحليل جديد للمشتركين النشطين، مع عدم تعطيل استجابة الطلب إذا كانت VAPID غير مهيأة. كما أصبح محول اللغة يحفظ اللغة في `localStorage` ويرسلها إلى ملف المستخدم عند وجود جلسة.

## ملحق pasted_content_34 — Market Leadership Expansion

تمت إضافة طبقة القيادة السوقية إلى المشروع مع الحفاظ على مبدأ عدم اختلاق بيانات مالية. أضيف كتالوج تعليمي من عشر دورات مع دروس وقوائم تقدم وشهادات تحقق، ونماذج Prisma وmigration incremental قابلة للتطبيق بعد مراجعة قاعدة البيانات. كما اكتملت واجهات المجتمع مع فئات وموضوعات وتفاصيل وردود وإعجاب وقبول الإجابة وسمعة المستخدمين، مع fallbacks عامة تمنع انهيار الواجهة عندما تكون قاعدة البيانات غير متاحة.

أضيفت مكتبة الفيديو والندوات مع صفحات التفاصيل وروابط التشغيل، ومحرك مساعد صوتي عربي يدعم Web Speech في المتصفح، وWhisper عبر `WHISPER_API_URL` للملفات الصوتية عند التهيئة، وgTTS عبر خدمة Python عند تهيئة `PYTHON_SERVICE_URL`. الأوامر المصادق عليها لإضافة سهم إلى قائمة المتابعة أو إنشاء تنبيه تُنفذ عبر خدمات المستخدم الحالية، بينما تبقى الأوامر غير المصادق عليها مسودات تعليمية ولا تنفذ أي معاملة مالية.

أضيفت صفحات حلول المؤسسات والمنظمات، وبرنامج الإحالة مع كود ومشاركة وتطبيق، والمدونة مع صفحات المقالات وJSON-LD وsitemap موسع. تم كذلك توثيق متغيرات Cloudinary وMux وOpenAI/Whisper الاختيارية دون تضمين أسرار أو تفعيل تكامل خارجي تلقائياً.

التحقق النهائي: `npm run typecheck` ناجح، و`npm run build` ناجح، و91 اختبار واجهة عبر 19 ملفاً ناجحة، و`prisma validate` و`prisma generate` ناجحان، و`BorsatyMobile/npm run typecheck` ناجح. اختبارات HTTP العامة أعادت 200 لـHealth والدورات وفئات المجتمع والموضوعات والمدونة والندوات، و401 للمسار المحمي دون جلسة. اختبار المساعد النصي أعاد 200 مع رد عربي واضح؛ وعند غياب مصادر السوق أعاد رسالة عدم توفر البيانات بدلاً من رقم مختلق.

القيود التشغيلية: يجب تطبيق migration الجديدة على Neon قبل استخدام التخزين الدائم للدورات والمجتمع والفيديو والإحالات والمدونة، ويجب توفير مفاتيح Whisper/gTTS وCloudinary/Mux أو Firebase عند الحاجة. لم يتم نشر أي نسخة جديدة أو تنفيذ معاملات مالية.

## ملحق pasted_content_35 — Legal, Support, Blog, Regional and SEO Expansion

تمت ترقية الطبقة القانونية بإضافة شروط استخدام مفصلة، سياسة خصوصية تتناول GDPR وCCPA وPDPL السعودي وقانون حماية البيانات المصري، إخلاء مسؤولية استثماري، وسياسات ملفات الارتباط والاستخدام المقبول والاسترداد وحقوق النشر وإتاحة الوصول. أضيفت روابط مركز الدعم من الصفحات الجديدة دون ادعاء تقديم استشارة مالية.

أضيف نظام دعم كامل تحت `/api/support`: إنشاء التذاكر، عرضها، الرسائل، الحالات، وقناة محادثة Socket.io على namespace `/support` تعمل حالياً بوضع chatbot آمن مع نقطة انتقال واضحة للتذاكر. أضيف مركز مساعدة وقاعدة معرفة تحتوي على 30 مقالاً مولداً من كتالوج موحد، مع بحث وتصنيفات وتقييم فائدة، وتخزين Prisma عند تطبيق migration أو fallback تشغيل صريح قبل ذلك.

تمت توسعة المدونة إلى 20 مقالاً في ست فئات، مع الحقول العربية والإنجليزية والوصف المختصر والكلمات المفتاحية وSEO ووقت القراءة والإعجابات والمشاركة والمقالات المميزة والتعليقات. أضيفت endpoints للتصنيفات، المقالات المميزة، RSS، sitemap blog، والتعليقات مع حماية النشر الإداري.

تمت إضافة أسواق EGX وTASI وDFM وADX وQSE، العملات المحلية، إعدادات الدولة واللغة، ولهجات `ar-EG` و`ar-SA` و`ar-AE` مع واجهة `/settings/regional`. الأسواق غير المفعلة معلنة بوضوح ولا تعرض على أنها بيانات تنفيذية.

تم تجهيز SEO الديناميكي: canonical وOpenGraph وTwitter Card وWebSite JSON-LD، ومسارات `/sitemap.xml` و`/sitemap-blog.xml` و`/sitemap-stocks.xml` و`/robots.txt`. كما أضيفت خدمة توزيع محتوى خارجية بوضع `draft-only` فقط؛ لا يتم نشر أي محتوى إلى Medium أو LinkedIn أو Twitter/X أو المنصات العربية دون مفاتيح ومراجعة بشرية.

### التحقق

نجح `npx prisma validate` و`npm run typecheck` و`npm run build` و`npm test`: 19 ملف اختبار و91 اختباراً. اختبارات API المحلية أعادت HTTP 200 للمعرفة والإقليمية وRSS وsitemap وrobots، وHTTP 401 لمسار التذاكر المحمي دون جلسة، وأعادت قاعدة المعرفة 30 مقالاً. لم يتم نشر أي محتوى خارجي في هذه المرحلة.

## ملحق المرحلة 7 — الأساس الهندسي وحزمة المخططات

تم إنشاء أساس معماري تدريجي بدلاً من إعادة كتابة خطرة: وثيقة المعمارية المستهدفة، ADR يثبت استراتيجية الانتقال التدريجي إلى Monorepo، مخطط تدفق البيانات، وحدود ملكية الحزم. أضيفت الحزم `@borsaty/design-system` و`@borsaty/types` و`@borsaty/utils` و`@borsaty/charts` مع إعدادات فحص مستقلة.

يحتوي نظام التصميم على 44 مكوناً موحداً وFinancial Tokens للألوان والمسافات والخطوط والحركة، مع دعم RTL والحالات المالية. تحتوي حزمة المخططات على عقد موحد للشموع وReplay Mode وregistry من 63 مؤشراً؛ ستة مؤشرات محلية منفذة فعلياً، بينما بقية المؤشرات موسومة كمزود أو مخطط لها ولا يتم عرضها كميزات منفذة.

تمت مراجعة `fcsapi/chart-js` من مستودعه الرسمي. يتطلب مفتاح API ومفتاح WebSocket منفصلين، لذلك لم يتم تفعيله تلقائياً أو وضع أسرار في Git. يستمر التطبيق الحالي في استخدام `lightweight-charts` عبر adapter حتى تتوفر مفاتيح المزود وقرار اعتماد بيانات واضح.

أضيفت GitHub Actions للاختبارات والبناء، CodeQL، Lighthouse اليدوي، النسخ الاحتياطي المجدول، والنشر اليدوي فقط. لا يقوم workflow النشر بأي نشر تلقائي، ولا يتم تشغيل النسخ الاحتياطي دون `DATABASE_URL` كـGitHub Secret.

### نتيجة التحقق

نجح فحص التطبيق والحزم، Prisma validation باستخدام رابط PostgreSQL شكلي آمن، build، التنسيق، و91 اختباراً. نجح smoke test لحزمة المخططات: 63 تعريفاً، 6 مؤشرات محلية، ورفض الشموع غير الصالحة. تم دفع التغييرات إلى `origin/main` في commits `15756bb` و`f31c7a1`.

## ملحق المرحلة 7 — Dashboard Widgets

أضيفت حزمة `@borsaty/widgets` بعقد مستقل: 12 نوع Widget، `DashboardGrid` للسحب وتبديل المواضع، `MarketHeatmap` للتلوين الدلالي، وحفظ layout محلياً دون تخزين بيانات حساسة. لا تجلب الحزمة بيانات ولا تتصل بقاعدة البيانات؛ التطبيق يمرر البيانات المتحققة إليها.

نجح فحص TypeScript للحزم والتطبيق، ونجح smoke test للـregistry: 12 Widget مع وجود Heatmap.

## ملحق المرحلة 7 — Strategy Builder

أضيفت حزمة `@borsaty/strategies` كطبقة عقود مستقلة لمنشئ استراتيجيات بصري لاحقاً. تحتوي على سجل من 23 نوع node ضمن input/indicator/logic/action/risk/output، وتحقق DAG يمنع العقد المكررة والمراجع المفقودة والحلقات وself-loop، ويلزم مخرجاً واحداً. أضيف قالب RSI تعليمي ومحاكي backtest تاريخي يعيد win rate وaverage return وmax drawdown مع disclaimer واضح.

المحاكي تعليمي فقط: لا يرسل أوامر، لا يتصل بوسيط، ولا يقدم ضماناً أو توصية استثمارية. نجح `npm run typecheck:packages` وsmoke test للتحقق من القالب، رفض cycle، ورفض أقل من 30 شمعة.

## ملحق المرحلة 7 — AI Strategy Assistant Contract

أضيف عقد typed لمساعد الاستراتيجيات يحدد الطلب والاستجابة وprovider قابل للحقن لاحقاً، مع التحقق من السؤال والرمز. التنفيذ الحالي fallback حتمي لا يستدعي LLM ولا يحتاج secrets أو credits؛ يعيد قالب RSI صالحاً، شرحاً تعليمياً، limitations، وdisclaimer. لا ينفذ صفقات ولا يقدم توصية مالية. smoke test يتحقق من الاستجابة الصحيحة ورفض السؤال الفارغ.

## ملحق المرحلة 7 — Visual Strategy Builder

بعد مراجعة README والترخيص والمستودع الرسمي، تم اعتماد `@xyflow/react` 12.11.6 بترخيص MIT، مع repository نشط وReact Flow 12 موثق رسمياً. تم عزله في route lazy على `/strategies` و`/strategy-builder`، وربطه فقط بعقد `@borsaty/strategies`; أي محاولة لإضافة edge تكسر DAG تُرفض في الواجهة قبل الحفظ.

المحاكاة والواجهة لا تنفذ صفقات ولا تتصل بوسيط. بناء الإنتاج نجح، وظهر chunk مستقل للصفحة بحجم 174.86 kB (55.68 kB gzip)، فلا يدخل في initial route chunk. نجحت TypeScript والحزم والاختبارات: 19 ملفاً و91 اختباراً.

أظهر `npm audit --omit=dev` مخاطر موجودة في سلسلة Prisma/Express (`deepmerge-ts` و`effect` و`qs`)؛ لم يُنفذ `npm audit fix --force` لأنه يقترح تغيير Prisma بشكل breaking. يلزم triage وترقية مستقلة قبل الإطلاق، ولا يُعد هذا الملحق إغلاقاً للمخاطر.

## ملحق المرحلة 7 — API Hardening

أضيفت security headers عبر Helmet مع CSP محافظ، `Cross-Origin-Resource-Policy: cross-origin` للموارد التي قد تخدمها الواجهة، و`X-Content-Type-Options` وHSTS. أضيف request-id آمن (مع قبول قيمة header مقيدة أو توليد UUID) وstructured JSON logs للطلب والمدة، ومعالج أخطاء لا يعيد stack أو تفاصيل داخلية للعميل.

أضيفت limits مخصصة للتحليل (30 طلباً/دقيقة لكل IP) وTradingView webhook (60/دقيقة) فوق المحدد العام، مع استمرار التحقق السري الثابت للـwebhook. اختبار HTTP ذري على المنفذ 41999 أعاد `/api/health` 200، أظهر CSP و`X-Request-ID`، رفض webhook بلا توقيع بـ401، وأعاد مؤشرات COMI الحقيقية المتاحة بـ200. سجل التشغيل المحلي أظهر أن alert checker يتوقف بأمان عندما تكون `DATABASE_URL` المحلية غير صالحة؛ لم تُنفذ أي migration أو نشر.

## ملحق المرحلة 7 — Fork Inventory

تم جرد 18 fork تحت حساب `borsaty2000-blip` قراءةً فقط. لا يوجد fork إضافي جاهز للاعتماد الإنتاجي المباشر. تم تصنيف `trading-signals` و`finance-dashboard` و`Statistical-analysis-of-EGX30` و`ElliottWaves` كمراجع، وSAHMK/Halal Terminal/finmagic كمرشحات مشروطة بمراجعات واختبارات، بينما بقيت forks ذات الترخيص المفقود أو المخاطر التشغيلية العالية مرفوضة حالياً. المصفوفة الكاملة والحدود موثقة في [`docs/integrations/fork-inventory.md`](docs/integrations/fork-inventory.md).

## ملحق المرحلة 7 — OpenAPI وSentry

أضيف `/api/openapi.json` بعقود أولية للمسارات المستقرة: health، التقرير، ملخص EGX/TASI، quote/candles، والمؤشرات/consensus. الوصف يذكر بوضوح أن الواجهات تعليمية ولا تنفذ صفقات أو تقدم ضمانات.

أضيف `@sentry/node` خلف `SENTRY_DSN` اختياري؛ عند غياب المتغير لا تتم تهيئة Sentry ولا يلزم secret. اختبار التشغيل المحلي بدون DSN أعاد OpenAPI 3.0.3 بثمانية مسارات وhealth سليماً.

## ملحق المرحلة 7 — Final QA Gate

بعد آخر إصلاح، نجح lint المستهدف لصفحة Strategy Builder، ونجح `npm run typecheck` و`npm run typecheck:packages` و`npm run build` و`npm test -- --run` (19 ملفاً، 91 اختباراً)، كما تطابق `HEAD` مع `origin/main` في لحظة الفحص. سجل Git المحلي نظيف بعد commit `4957760`.

لم ينجح `npm run lint` العام بسبب baseline debt سابق في صفحات متعددة (استعمال `any`، دوال function declarations، وتحذير setState داخل effect)، وليس بسبب الملفات الجديدة. كما أن `npm run format:check` العام يرصد 29 ملفاً قديماً غير منسق، خصوصاً ملفات Mobile وlegacy. لم أعد تنسيقها آلياً حتى لا أُدخل diff واسعاً غير متعلق بالمرحلة؛ يجب معالجتها في مهمة مستقلة أو اعتماد gate تدريجي موثق قبل إطلاق واسع.
