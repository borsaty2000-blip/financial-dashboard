CREATE TABLE IF NOT EXISTS "analyst_subscriptions" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "analystId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analyst_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "analyst_subscriptions_subscriberId_analystId_key" ON "analyst_subscriptions"("subscriberId", "analystId");
CREATE INDEX IF NOT EXISTS "analyst_subscriptions_analystId_idx" ON "analyst_subscriptions"("analystId");
DO $$ BEGIN
 ALTER TABLE "analyst_subscriptions" ADD CONSTRAINT "analyst_subscriptions_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
 ALTER TABLE "analyst_subscriptions" ADD CONSTRAINT "analyst_subscriptions_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
