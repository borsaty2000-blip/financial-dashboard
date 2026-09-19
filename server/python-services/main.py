from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
import io
from pydantic import BaseModel, Field

from services.elliott_wave import analyze_elliott_wave
from services.elliott_pro import analyze as analyze_elliott_pro
from services.elliott_mtf import analyze_elliott_mtf
from services.gann import analyze_gann
from services.statistical import calculate_statistics
from services.forecasting import forecast_arima, forecast_lstm
from services.backtesting import backtest_elliott, backtest_gann, backtest_indicators
from services.candlestick import detect_candlestick_patterns
from services.ensemble import ensemble_forecast
from services.arabic_sentiment import analyze_sentiment, get_stock_sentiment
from services.anomaly import get_anomaly_score
from utils.data_prep import prepare_dates, prepare_prices
from services.tts_service import generate_analysis_audio

app = FastAPI(title="Borsaty Analysis Service", version="1.1.0")


class PriceData(BaseModel):
    prices: List[float] = Field(min_length=3)
    order: int = Field(default=5, ge=1, le=50)


class ElliottMTFData(BaseModel):
    candles_by_tf: Dict[str, List[Dict[str, Any]]]


class GannData(BaseModel):
    prices: List[float] = Field(min_length=3)
    dates: List[str] = Field(min_length=3)


class StatisticalData(BaseModel):
    prices: List[float] = Field(min_length=3)


class ForecastData(BaseModel):
    prices: List[float] = Field(min_length=20)
    steps: int = Field(default=30, ge=1, le=365)


class EnsembleData(BaseModel):
    prices: List[float] = Field(min_length=30)
    steps: int = Field(default=30, ge=1, le=90)


class BacktestData(BaseModel):
    prices: List[float] = Field(min_length=40)
    lookback: int = Field(default=30, ge=5, le=365)
    horizon: int = Field(default=7, ge=1, le=90)
    strategy: str = "rsi_macd"


class CandlestickData(BaseModel):
    opens: List[float] = Field(min_length=2)
    highs: List[float] = Field(min_length=2)
    lows: List[float] = Field(min_length=2)
    closes: List[float] = Field(min_length=2)
    dates: List[str] | None = None


class AnomalyData(BaseModel):
    symbol: str = "UNKNOWN"
    prices: List[float] = Field(min_length=20)
    volumes: List[float] | None = None


class SentimentData(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class TTSData(BaseModel):
    symbol: str
    analysis: dict


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "borsaty-analysis"}


@app.post("/analyze/elliott")
async def elliott_endpoint(data: PriceData) -> dict:
    try:
        prices = prepare_prices(data.prices)
        candles = [{"open": price, "high": price, "low": price, "close": price, "volume": 0} for price in prices]
        result = analyze_elliott_pro(candles)
        if not result.get("available"):
            result = analyze_elliott_wave(prices, data.order)
            result["engine_mode"] = "educational_fallback"
        else:
            result["engine_mode"] = "elliott_pro"
        return {"status": "success", "data": result}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Elliott analysis failed") from error


@app.post("/analyze/elliott/mtf")
async def elliott_mtf_endpoint(data: ElliottMTFData) -> dict:
    try:
        clean = {
            timeframe: candles
            for timeframe, candles in data.candles_by_tf.items()
            if isinstance(candles, list)
        }
        return {"status": "success", "data": analyze_elliott_mtf(clean)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Elliott MTF analysis failed") from error


@app.post("/analyze/gann")
async def gann_endpoint(data: GannData) -> dict:
    try:
        prices = prepare_prices(data.prices)
        dates = prepare_dates(data.dates, len(prices))
        return {"status": "success", "data": analyze_gann(prices, dates)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Gann analysis failed") from error


@app.post("/analyze/statistical")
async def statistical_endpoint(data: StatisticalData) -> dict:
    try:
        return {"status": "success", "data": calculate_statistics(prepare_prices(data.prices))}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Statistical analysis failed") from error


@app.post("/forecast/arima")
async def arima_endpoint(data: ForecastData) -> dict:
    try:
        return {"status": "success", "data": forecast_arima(prepare_prices(data.prices), data.steps)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="ARIMA forecast failed") from error


@app.post("/forecast/lstm")
async def lstm_endpoint(data: ForecastData) -> dict:
    try:
        return {"status": "success", "data": forecast_lstm(prepare_prices(data.prices), data.steps)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="LSTM forecast failed") from error


@app.post("/forecast/ensemble")
async def ensemble_endpoint(data: EnsembleData) -> dict:
    try:
        return {"status": "success", "data": ensemble_forecast(prepare_prices(data.prices), data.steps)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Ensemble forecast failed") from error


@app.get("/sentiment/{symbol}")
async def sentiment_endpoint(symbol: str) -> dict:
    return {"status": "success", "data": get_stock_sentiment(symbol)}


@app.post("/analyze/sentiment")
async def sentiment_text_endpoint(data: SentimentData) -> dict:
    return {"status": "success", "data": analyze_sentiment(data.text)}


@app.post("/analyze/anomaly")
async def anomaly_endpoint(data: AnomalyData) -> dict:
    try:
        return {"status": "success", "data": get_anomaly_score(data.symbol, data.prices, data.volumes)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/backtest/elliott")
async def backtest_elliott_endpoint(data: BacktestData) -> dict:
    try:
        return {"status": "success", "data": backtest_elliott(prepare_prices(data.prices), data.lookback, data.horizon)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/backtest/gann")
async def backtest_gann_endpoint(data: BacktestData) -> dict:
    try:
        return {"status": "success", "data": backtest_gann(prepare_prices(data.prices), data.lookback, data.horizon)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/backtest/indicators")
async def backtest_indicators_endpoint(data: BacktestData) -> dict:
    try:
        return {"status": "success", "data": backtest_indicators(prepare_prices(data.prices), data.strategy, data.lookback, data.horizon)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/analyze/candlestick")
async def candlestick_endpoint(data: CandlestickData) -> dict:
    try:
        return {"status": "success", "data": detect_candlestick_patterns(data.opens, data.highs, data.lows, data.closes, data.dates)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/tts/analysis")
async def tts_endpoint(data: TTSData):
    try:
        audio = generate_analysis_audio(data.symbol, data.analysis)
        return StreamingResponse(io.BytesIO(audio), media_type="audio/mpeg")
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail="تعذر توليد التحليل الصوتي") from error
