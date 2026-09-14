# إصلاح Duplicate React — 14 سبتمبر 2026

## النتيجة

تم إصلاح خطأ:

```text
Cannot read properties of null (reading 'useContext')
```

كان السبب وجود React 19.3.0 في `node_modules` الجذري نتيجة وضع `react-i18next` ضمن حزمة الخادم، إلى جانب React 19.2.8 داخل `client/node_modules`. بعد الإصلاح أصبح React وReact DOM وجميع مكتبات React موجودة في `client` فقط.

## التشخيص قبل الإصلاح

### client/npm ls react

```text
financial-dashboard-client@0.0.0
├─ @testing-library/react → react@19.2.8 deduped
├─ @xyflow/react → react@19.2.8 deduped
├─ lucide-react → react@19.2.8 deduped
├─ react-dom@19.2.8 → react@19.2.8 deduped
├─ react@19.2.8
└─ recharts → react@19.2.8 deduped
```

### root/npm ls react

```text
financial-dashboard@0.0.0
└─ react-i18next@17.0.14
   ├─ react@19.3.0
   └─ use-sync-external-store → react@19.3.0 deduped
```

### المواقع قبل الإصلاح

```text
node_modules/react                       موجود: React 19.3.0
client/node_modules/react                موجود: React 19.2.8
node_modules/react-dom                   موجود
client/node_modules/react-dom            موجود
client/node_modules/lucide-react         موجود
client/node_modules/@vitejs/plugin-react موجود
```

## ما حُذف وأعيد إنشاؤه

حُذفت العناصر التالية بالكامل:

```text
node_modules/
client/node_modules/
package-lock.json
client/package-lock.json
```

ثم أُعيد تثبيت حزمة الجذر وحزمة العميل وتوليد lockfiles جديدة. واجه npm 10.9.2 عيباً داخلياً في Arborist باسم `Cannot read properties of null (reading 'edgesOut')` أثناء تثبيت العميل؛ اكتمل التثبيت بنجاح باستخدام npm 11.6.0 مع Node 22، وخرج تدقيق client بدون vulnerabilities.

## تغييرات حدود الاعتماديات

نُقلت الحزم الأمامية التالية من الجذر إلى `client/package.json`:

- `i18next`
- `i18next-browser-languagedetector`
- `react-i18next`
- `lightweight-charts`

وأزيلت `lightweight-charts-drawing` غير المستخدمة من الجذر. `lucide-react` و`@vitejs/plugin-react` كانتا بالفعل داخل العميل فقط.

لم يتحول المشروع إلى npm workspace لأن `server/` لا يحتوي `package.json` مستقلاً، ولأن تحويله إلى workspace الآن قد يؤدي إلى hoisting لـReact إلى الجذر ويعيد نفس المشكلة. حزمة الجذر هي Backend الفعلي وليست مجرد manifest فارغ.

## Vite

يتضمن `client/vite.config.ts` الآن:

- `root` مثبتاً على مجلد `client`.
- `resolve.dedupe` لـ`react` و`react-dom`.
- alias باسم `@` إلى `client/src`.
- `optimizeDeps.include` لـReact وReact DOM.
- الحفاظ على Tailwind وmanual chunks وAPI proxy الحاليين.

تم الاحتفاظ بـ`@vitejs/plugin-react` 6.x لأنه الإصدار المتوافق مع Vite 8 الحالي؛ خفضه قسراً إلى 4.x سيعيد المشروع إلى مجموعة إصدارات أقدم ويضيف مخاطرة توافق بلا حاجة.

## التحقق بعد الإصلاح

### root/npm ls react

```text
financial-dashboard@0.0.0
└── (empty)
```

### client/npm ls react

كل الاعتماديات تشير إلى نسخة واحدة deduped:

```text
react@19.3.0
react-dom@19.3.0
```

المواقع النهائية:

```text
node_modules/react                         absent
node_modules/react-dom                     absent
node_modules/lucide-react                  absent
node_modules/@vitejs/plugin-react          absent
client/node_modules/react                  present
client/node_modules/react-dom              present
client/node_modules/lucide-react           present
client/node_modules/@vitejs/plugin-react   present
```

## بوابات الجودة

- Root TypeScript: ناجح.
- Shared packages TypeScript: ناجح.
- Vite production build: ناجح.
- Vitest: 19 ملفات، 91 اختباراً ناجحاً.
- Preview frontend: HTTP 200.
- Preview backend health: HTTP 200.
- Financial report endpoint: HTTP 200.
- الصفحة الرئيسية: تعمل بلا Error Boundary.
- Strategy Builder وReact Flow: يعملان.
- Browser console: لا أخطاء.

لم يتم تنفيذ نشر خارجي أو migration لقاعدة البيانات.
