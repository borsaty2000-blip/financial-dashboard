from __future__ import annotations
import io

def generate_analysis_audio(symbol: str, analysis: dict) -> bytes:
    try:
        from gtts import gTTS
    except ImportError as error:
        raise RuntimeError('gTTS غير مثبت أو غير مهيأ') from error
    text = (f"تحليل سهم {symbol}. السعر الحالي {analysis.get('price', 'غير متاح')}. " f"التغير {analysis.get('change', 'غير متاح')} بالمئة. " f"التوصية التعليمية: {analysis.get('signal', 'انتظار')}. " f"نسبة الثقة {analysis.get('confidence', 'غير متاح')} بالمئة. " f"الهدف السعري {analysis.get('target', 'غير متاح')}.")
    buffer = io.BytesIO()
    gTTS(text=text, lang='ar', slow=False).write_to_fp(buffer)
    return buffer.getvalue()
