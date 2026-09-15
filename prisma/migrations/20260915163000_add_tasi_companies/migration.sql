CREATE TABLE IF NOT EXISTS "tasi_companies" (
    "id" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "market" TEXT NOT NULL DEFAULT 'TASI',
    "sector" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tasi_companies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tasi_companies_sourceCode_key" ON "tasi_companies"("sourceCode");
CREATE UNIQUE INDEX IF NOT EXISTS "tasi_companies_symbol_key" ON "tasi_companies"("symbol");
CREATE INDEX IF NOT EXISTS "tasi_companies_market_symbol_idx" ON "tasi_companies"("market", "symbol");
