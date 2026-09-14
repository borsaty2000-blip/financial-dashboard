CREATE TABLE IF NOT EXISTS "market_candles" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "market_candles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "market_candles_symbol_market_interval_date_key" ON "market_candles"("symbol", "market", "interval", "date");
CREATE INDEX IF NOT EXISTS "market_candles_symbol_market_date_idx" ON "market_candles"("symbol", "market", "date");
