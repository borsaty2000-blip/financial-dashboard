"""Telegram bot اختياري.
يتطلب TELEGRAM_BOT_TOKEN وpython-telegram-bot وhttpx.
"""
from __future__ import annotations
import os
import httpx

API_URL = os.getenv("BORSATY_API_URL", "https://borsatyai.com").rstrip("/")

async def api_get(path: str):
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.get(f"{API_URL}{path}")
        response.raise_for_status()
        return response.json()

async def start(update, context):
    await update.message.reply_text("مرحباً في بوت بورصتي.\n/analyze SYMBOL تحليل سهم\n/top أفضل الأسهم\n/news آخر الأخبار\n/portfolio محفظتي\n/alert SYMBOL > PRICE إنشاء تنبيه\n/help مساعدة")

async def help_command(update, context):
    await start(update, context)

async def analyze(update, context):
    if not context.args:
        await update.message.reply_text("الرجاء إدخال رمز السهم. مثال: /analyze COMI")
        return
    symbol = context.args[0].upper()
    try:
        result = await api_get(f"/api/analysis/{symbol}/consensus")
        data = result.get("data", {})
        await update.message.reply_text(f"تحليل {symbol}\nالتوصية: {data.get('signal', 'غير متاح')}\nالإجماع: {data.get('score', '—')}/100\nالثقة: {data.get('confidence', '—')}%\n{data.get('recommendation', '')}")
    except Exception:
        await update.message.reply_text("تعذر جلب التحليل الآن؛ حاول لاحقاً.")

async def top(update, context):
    try:
        result = await api_get("/api/screener/scan?sort=consensus&limit=5")
        rows = result.get("data", [])
        message = "أفضل الأسهم المتاحة:\n" + "\n".join(f"{index}. {row.get('symbol', '—')}" for index, row in enumerate(rows, 1))
        await update.message.reply_text(message)
    except Exception:
        await update.message.reply_text("لا تتوفر قائمة أفضل الأسهم حالياً.")

async def news(update, context):
    try:
        result = await api_get("/api/news?limit=5")
        rows = result.get("data", [])
        await update.message.reply_text("آخر الأخبار:\n" + "\n".join(f"- {item.get('title', '—')}" for item in rows))
    except Exception:
        await update.message.reply_text("لا تتوفر الأخبار حالياً.")

async def portfolio(update, context):
    await update.message.reply_text("افتح محفظتك داخل منصة بورصتي بعد تسجيل الدخول لرؤية المراكز.")

async def alert(update, context):
    if len(context.args) < 3:
        await update.message.reply_text("الاستخدام: /alert COMI > 140")
        return
    await update.message.reply_text("لأمان حسابك، أنشئ التنبيه من صفحة التنبيهات بعد تسجيل الدخول.")

def build_application():
    from telegram.ext import Application, CommandHandler
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("analyze", analyze))
    app.add_handler(CommandHandler("top", top))
    app.add_handler(CommandHandler("news", news))
    app.add_handler(CommandHandler("portfolio", portfolio))
    app.add_handler(CommandHandler("alert", alert))
    return app

if __name__ == "__main__":
    build_application().run_polling()
