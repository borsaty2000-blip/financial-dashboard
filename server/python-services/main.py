from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.elliott_wave import analyze_elliott_wave
from services.gann import analyze_gann
from utils.data_prep import prepare_dates, prepare_prices

app = FastAPI(title="Borsaty Analysis Service", version="1.0.0")


class PriceData(BaseModel):
    prices: List[float] = Field(min_length=3)
    order: int = Field(default=5, ge=1, le=50)


class GannData(BaseModel):
    prices: List[float] = Field(min_length=3)
    dates: List[str] = Field(min_length=3)


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
