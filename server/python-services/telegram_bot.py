"""Optional Telegram bot adapter.
Run only after installing python-telegram-bot and setting TELEGRAM_BOT_TOKEN.
"""
from __future__ import annotations

import os

COMMANDS = {
    "/start": "مرحباً بك في BorsatyBot. استخدم /analyze COMI أو /top أو /alert.",
    "/top": "ستظهر قائمة الأفضل عند توافر مصدر سوق موثوق.",
    "/portfolio": "افتح محفظتك داخل منصة بورصتي لرؤية التفاصيل.",
}


def reply_for(text: str) -> str:
    parts = text.strip().split()
    command = parts[0].lower() if parts else ""
    if command == "/analyze":
        return f"طلب تحليل {parts[1].upper()} مسجل؛ افتح صفحة السهم." if len(parts) > 1 else "استخدم /analyze SYMBOL"
    if command == "/alert":
        return "أنشئ التنبيه من داخل المنصة بعد تسجيل الدخول."
    return COMMANDS.get(command, "الأوامر: /analyze SYMBOL، /top، /alert، /portfolio")


def build_application():
    from telegram.ext import Application, CommandHandler, MessageHandler, filters

    token = os.environ["TELEGRAM_BOT_TOKEN"]
    app = Application.builder().token(token).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, lambda update, context: update.message.reply_text(reply_for(update.message.text))))
    return app


if __name__ == "__main__":
    build_application().run_polling()
