CREATE TABLE IF NOT EXISTS "signals" (
  "id" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "market" TEXT NOT NULL,
  "timeframe" TEXT NOT NULL,
  "signalType" TEXT NOT NULL,
  "entryPrice" DOUBLE PRECISION NOT NULL,
  "stopLoss" DOUBLE PRECISION NOT NULL,
  "target1" DOUBLE PRECISION,
  "target2" DOUBLE PRECISION,
  "target3" DOUBLE PRECISION,
  "confluence" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "outcome" TEXT,
  "pnlPercent" DOUBLE PRECISION,
  CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "signals_symbol_status_createdAt_idx" ON "signals"("symbol", "status", "createdAt");
