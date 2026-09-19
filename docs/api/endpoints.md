# BorsatyAI API — التحليل والبيانات

## بيانات السوق

```http
GET /api/market/candles/BTCUSDT?market=CRYPTO&days=250
GET /api/market/candles/XAUUSD?market=COMMODITIES&days=250
```

تعيد الاستجابة `candles` و`count` و`source` و`data_quality`. في الاختبار المحلي أعاد BTCUSDT عدد 250 من Binance، وأعاد XAUUSD عدد 250 من Yahoo Finance. حالة المصدر التاريخية أو المتأخرة لا تعني بثاً لحظياً.

## التحليل

```http
POST /api/analysis/COMI/elliott-mtf
POST /api/analysis/COMI/gann
POST /api/analysis/COMI/harmonic
POST /api/analysis/COMI/confluence
POST /api/analysis/COMI/recommendation
GET  /api/analysis/COMI/matrix?market=EGX
```

مسارات POST تقبل مصفوفة `candles` في الجسم عند الحاجة. إذا لم تُرسل، تستخدم الخدمة السلسلة التاريخية من مصدر السوق. يعيد Matrix حالة كل إطار زمني، و`alignment`، و`consensus`، ولا ينشئ إشارة للإطار الذي لا تتوفر له شموع كافية.

## Backtesting

```http
POST /api/backtest/COMI
Content-Type: application/json

{"strategy":"gann","timeframe":"daily","commission":0.002,"slippage":0.001}
```

يعتمد الاختبار على الأسعار التاريخية المتاحة، ويعيد `trades` و`equity_curve` و`win_rate` و`profit_factor` و`max_drawdown` و`sharpe` و`sortino`. العمولة والانزلاق يخصمان مرتين، عند الدخول والخروج، ولا توجد قراءة مستقبلية أثناء توليد الإشارة.

## Signal History

```http
GET /api/signals?symbol=COMI&status=ACTIVE
```

يعرض الإشارات التاريخية المسجلة في جدول `signals`. عند عدم تطبيق migration أو تعذر قاعدة البيانات يعيد `503` صريحاً بدلاً من قائمة وهمية.

## التقارير

```http
GET /api/reports/stock/COMI/pdf?market=EGX&lang=ar
GET /api/reports/stock/1010/pdf?market=TASI&lang=ar
```

التقرير يتضمن 11 صفحة تحليلية ومعلومات المصدر وجودة البيانات والإخلاء التعليمي.
