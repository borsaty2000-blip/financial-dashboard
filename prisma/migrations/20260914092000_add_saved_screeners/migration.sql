CREATE TABLE IF NOT EXISTS "saved_screeners" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_screeners_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "saved_screeners_userId_idx" ON "saved_screeners"("userId");
DO $$ BEGIN
 ALTER TABLE "saved_screeners" ADD CONSTRAINT "saved_screeners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
