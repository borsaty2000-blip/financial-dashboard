CREATE TABLE IF NOT EXISTS "economic_events" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "country" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "importance" TEXT NOT NULL,
    "previous" TEXT,
    "forecast" TEXT,
    "actual" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "economic_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "economic_events_eventKey_key" ON "economic_events"("eventKey");
CREATE INDEX IF NOT EXISTS "economic_events_date_country_importance_idx" ON "economic_events"("date", "country", "importance");
