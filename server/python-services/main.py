from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.elliott_wave import analyze_elliott_wave
from services.gann import analyze_gann
from services.statistical import calculate_statistics
from services.forecasting import forecast_arima, forecast_lstm
from utils.data_prep import prepare_dates, prepare_prices

app = FastAPI(title="Borsaty Analysis Service", version="1.0.0")


class PriceData(BaseModel):
    prices: List[float] = Field(min_length=3)
    order: int = Field(default=5, ge=1, le=50)


class GannData(BaseModel):
    prices: List[float] = Field(min_length=3)
    dates: List[str] = Field(min_length=3)


class StatisticalData(BaseModel):
    prices: List[float] = Field(min_length=3)


class ForecastData(BaseModel):
    prices: List[float] = Field(min_length=20)
    steps: int = Field(default=30, ge=1, le=365)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "borsaty-analysis"}


@app.post("/analyze/elliott")
async def elliott_endpoint(data: PriceData) -> dict:
    try:
        return {"status": "success", "data": analyze_elliott_wave(prepare_prices(data.prices), data.order)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Elliott analysis failed") from error


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
