# التقرير النهائي — إصلاح Python Functions في Vercel

**التاريخ:** 2026-09-20  
**النطاق:** إصلاحات محلية فقط، دون commit أو push أو تسجيل دخول أو تغيير Secrets/Environment Variables.

## 1. النتيجة التنفيذية

تم تنفيذ إصلاحات Python Functions المطلوبة محلياً. أصبحت جميع ملفات وظائف Vercel قابلة للتحميل محلياً بعد تحويل imports إلى lazy imports، وأصبح `health.py` مستقلاً تماماً عن أي ملف مساعد أو حزمة خارجية. كما تم ضبط `vercel.json` على Python 3.11 وإضافة `api/python/requirements.txt`.

لم يتم تنفيذ أي commit أو push. ولم يتم تشغيل `vercel dev` بنجاح، لأنه طلب تسجيل دخول إلى Vercel؛ أُوقفت العملية فوراً دون تسجيل الدخول.

## 2. الملفات المعدلة

| الملف | التعديل | السبب |
|---|---|---|
| `vercel.json` | إضافة builds لـ Node وPython، تعيين runtime إلى `python3.11`، جعل `includeFiles` نصاً، وإضافة routes منفصلة لـ `/api/python` | منع فشل schema وتوجيه Python Functions مباشرة بدلاً من تمريرها إلى Node catch-all |
| `api/python/requirements.txt` | ملف جديد يضم الاعتماديات اللازمة لوظائف Python | توفير الحزم المطلوبة عند بناء Python Functions |
| `api/python/health.py` | إزالة import `_common` وجعل الوظيفة مستقلة | منع فشل module import وقت تحميل الوظيفة |
| `api/python/elliott.py` | نقل `sys.path` وimports والخدمات إلى داخل `do_POST` و`do_OPTIONS` | منع تحميل الخدمات قبل بدء الطلب |
| `api/python/gann.py` | نفس lazy-import pattern | منع فشل التحميل المبكر |
| `api/python/forecast.py` | نفس lazy-import pattern | تأجيل تحميل `statsmodels` وموارد التنبؤ حتى الطلب |
| `api/python/statistical.py` | نفس lazy-import pattern | تأجيل تحميل `scipy` و`arch` حتى الطلب |
| `api/python/harmonic.py` | لم يكن الملف موجوداً، ولم يتم إنشاؤه | لا يوجد endpoint أو ملف Harmonic مستقل ضمن بنية `api/python` الحالية |
| `server/python-services/requirements.txt` | لم يُعدّل في هذه الجولة؛ كان يحتوي مسبقاً على `numpy`, `pandas`, `scipy` وباقي الاعتماديات | تجنب تغيير بيئة الخادم الحالية بلا حاجة |

## 3. النص الكامل لـ `vercel.json`

```json
{
	"version": 2,
	"buildCommand": "npx prisma generate && npm run build",
	"installCommand": "npm install --include=dev --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 && npm --prefix client install --include=dev --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000",
	"outputDirectory": "client/dist",
	"builds": [
		{ "src": "api/index.ts", "use": "@vercel/node" },
		{ "src": "api/python/*.py", "use": "@vercel/python" }
	],
	"functions": {
		"api/index.ts": {
			"includeFiles": "server/**"
		},
		"api/python/*.py": {
			"runtime": "python3.11",
			"includeFiles": "server/python-services/**"
		}
	},
	"routes": [
		{ "src": "/api/python/(.*)", "dest": "/api/python/$1" },
		{ "src": "/api/(.*)", "dest": "/api/index.ts" },
		{ "src": "/(.*)", "dest": "/index.html" }
	]
}
```

## 4. النص الكامل لـ `api/python/requirements.txt`

```text
numpy==1.26.3
pandas==2.2.0
scipy==1.12.0
scikit-learn==1.4.0
statsmodels==0.14.1
arch==6.2.0
python-dateutil==2.8.2
```

أضيفت الحزم الثلاث المطلوبة (`numpy`, `pandas`, `scipy`) بالإضافة إلى الاعتماديات التي تستوردها وظائف `forecast.py` و`statistical.py` فعلياً (`scikit-learn`, `statsmodels`, `arch`, و`python-dateutil`).

## 5. النص الكامل لـ `api/python/health.py`

```python
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
import json


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps(
            {
                "status": "ok",
                "service": "borsatyai-python",
                "runtime": "vercel-python-serverless",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            ensure_ascii=False,
        ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
```

## 6. تفاصيل تعديل وظائف Python

### `api/python/elliott.py`

تم حذف imports الخاصة بـ `_common` و`ElliottPro` من مستوى الملف. أصبحت تهيئة `sys.path` واستيراد `read_json`, `respond`, و`ElliottPro` داخل `do_POST`. وتم نقل استيراد `error` إلى كتلة الخطأ، واستيراد `options` إلى `do_OPTIONS`. منطق التحليل وعقد الاستجابة لم يتغيرا.

### `api/python/gann.py`

تم نقل تهيئة مسار `server/python-services` واستيراد `GannPro` وhelpers إلى داخل handlers. بقي شرط الحد الأدنى 50 شمعة وعقد `source: python_vercel` كما هو.

### `api/python/forecast.py`

تم نقل استيراد `forecast_arima` و`forecast_lstm` إلى داخل `do_POST`. هذا يؤجل تحميل مكتبات التنبؤ الثقيلة حتى استخدام endpoint فعلياً.

### `api/python/statistical.py`

تم نقل استيراد `calculate_statistics` إلى داخل `do_POST`، مع تحويل القيم إلى `float` قبل الحساب. هذا يؤجل تحميل `scipy` و`arch` ويمنع فشل module import غير الضروري.

### `api/python/harmonic.py`

لا يوجد هذا الملف في المشروع الحالي، لذلك لم يتم تعديل أو إنشاء ملف Harmonic ضمن هذه الجولة.

## 7. سبب الخطأ الذي تم تشخيصه

### فحص `main.py` خارج البيئة الافتراضية

أعاد الخطأ الكامل التالي:

```text
Traceback (most recent call last):
  File "<stdin>", line 3, in <module>
  File "/home/ubuntu/financial-dashboard/server/python-services/main.py", line 8, in <module>
    from services.elliott_wave import analyze_elliott_wave
  File "/home/ubuntu/financial-dashboard/server/python-services/services/elliott_wave.py", line 6, in <module>
    from .pivots import ordered_pivots
  File "/home/ubuntu/financial-dashboard/server/python-services/services/pivots.py", line 4, in <module>
    from scipy.signal import find_peaks
ModuleNotFoundError: No module named 'scipy'
```

داخل البيئة الافتراضية، نجح import الخادم:

```text
main_import=OK
has_app= True
```

### فحص imports الأولي لوظائف Vercel

ظهر خطأ indentation بعد أول تطبيق آلي للـ lazy imports. الخطأ الكامل كان:

```text
--- /home/ubuntu/financial-dashboard/api/python/forecast.py
Traceback (most recent call last):
  File "/tmp/check_vercel_python_imports.py", line 17, in <module>
    spec.loader.exec_module(module)
  File "<frozen importlib._bootstrap_external>", line 991, in exec_module
  File "<frozen importlib._bootstrap_external>", line 1129, in get_code
  File "<frozen importlib._bootstrap_external>", line 1059, in source_to_code
  File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
  File "/home/ubuntu/financial-dashboard/api/python/forecast.py", line 15
    prices = payload.get("prices", [])
                                      ^
IndentationError: unindent does not match any outer indentation level

--- /home/ubuntu/financial-dashboard/api/python/gann.py
...
  File "/home/ubuntu/financial-dashboard/api/python/gann.py", line 15
    candles = payload.get("candles", [])
                                        ^
IndentationError: unindent does not match any outer indentation level

--- /home/ubuntu/financial-dashboard/api/python/statistical.py
...
  File "/home/ubuntu/financial-dashboard/api/python/statistical.py", line 15
    prices = payload.get("prices", [])
                                      ^
IndentationError: unindent does not match any outer indentation level
```

تم إصلاح هذه الأخطاء بإعادة تنسيق الملفات بمسافات Python موحدة.

## 8. نتائج الاختبارات المحلية

| الاختبار | النتيجة |
|---|---|
| `npm run typecheck` | **ناجح** — دون أخطاء TypeScript |
| `npm run test:server` | **ناجح** — 32 اختباراً، 0 فشل |
| `npm run build` | **ناجح** — Vite build اكتمل بنجاح |
| `pytest tests/` | **ناجح** — 8 اختبارات، 0 فشل |
| `python3 -m py_compile api/python/*.py` | **ناجح** |
| imports معزولة لكل وظائف `api/python/*.py` | **ناجح** — Elliott وForecast وGann وHealth وStatistical |
| `server/python-services/.venv/bin/python` import لـ `main` | **ناجح** — `main_import=OK`, `has_app=True` |
| تحقق بنية `vercel.json` محلياً | **ناجح** — runtime Python 3.11 وجميع includeFiles نصوص |

ملاحظة البناء الوحيدة غير الفاشلة:

```text
Some chunks are larger than 500 kB after minification.
Consider using dynamic import() to code-split the application.
```

هذا **تحذير حجم** من Vite وليس فشل بناء.

## 9. اختبار `vercel dev`

تمت محاولة تشغيل:

```text
npx vercel dev --listen 4120
```

لكن Vercel CLI طلب تسجيل دخول خارجي:

```text
Vercel CLI 59.23.2 (Node.js 22.13.0)
> No existing credentials found. Please log in:
>
  Visit https://vercel.com/oauth/device?user_code=TZRK-XZPB
⠦ Waiting for authentication...
```

تم إيقاف العملية فوراً. لم يتم تسجيل الدخول، ولم يتم الاتصال بـ Vercel، ولم يتم تغيير أي إعداد خارجي. لذلك لا توجد نتيجة HTTP محلية من `vercel dev`، بينما فحص imports و`py_compile` نجحا بالكامل.

## 10. حالة Git والنشر

- **لم يتم تنفيذ commit في هذه الجولة.**
- **لم يتم تنفيذ push إلى `origin/main`.**
- **لم يتم تنفيذ redeploy أو promote أو rollback.**
- **لم يتم تعديل Environment Variables أو Secrets.**
- الإصلاحات الحالية موجودة محلياً فقط وتنتظر قرار المستخدم قبل أي commit أو push.
