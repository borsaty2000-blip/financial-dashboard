CREATE TABLE IF NOT EXISTS "egx_companies" (
    "id" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "market" TEXT NOT NULL DEFAULT 'EGX',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "egx_companies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "egx_companies_sourceCode_key" ON "egx_companies"("sourceCode");
CREATE UNIQUE INDEX IF NOT EXISTS "egx_companies_symbol_key" ON "egx_companies"("symbol");
CREATE INDEX IF NOT EXISTS "egx_companies_market_symbol_idx" ON "egx_companies"("market", "symbol");
