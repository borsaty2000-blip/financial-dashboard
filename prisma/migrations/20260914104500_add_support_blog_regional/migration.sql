ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "readingTime" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "likes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "shares" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "blog_comments" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "parentId" TEXT,
  "likes" INTEGER NOT NULL DEFAULT 0,
  "isApproved" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "blog_comments_postId_createdAt_idx" ON "blog_comments"("postId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "blog_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ticketNumber" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "assignedTo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");
CREATE INDEX IF NOT EXISTS "support_tickets_userId_status_idx" ON "support_tickets"("userId", "status");
DO $$ BEGIN
  ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "attachments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "support_messages_ticketId_createdAt_idx" ON "support_messages"("ticketId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "knowledge_articles" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "titleEn" TEXT,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "views" INTEGER NOT NULL DEFAULT 0,
  "helpful" INTEGER NOT NULL DEFAULT 0,
  "notHelpful" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_articles_slug_key" ON "knowledge_articles"("slug");
CREATE INDEX IF NOT EXISTS "knowledge_articles_category_isPublished_idx" ON "knowledge_articles"("category", "isPublished");

CREATE TABLE IF NOT EXISTS "markets" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "workingDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tradingHours" JSONB NOT NULL,
  "regulator" TEXT NOT NULL,
  "laws" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "markets_code_key" ON "markets"("code");

CREATE TABLE IF NOT EXISTS "currencies" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "decimals" INTEGER NOT NULL DEFAULT 2,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "exchangeRate" DOUBLE PRECISION,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "currencies_code_key" ON "currencies"("code");

CREATE TABLE IF NOT EXISTS "localizations" (
  "id" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "dialect" TEXT,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "localizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "localizations_language_key_key" ON "localizations"("language", "key");
CREATE INDEX IF NOT EXISTS "localizations_country_idx" ON "localizations"("country");

DO $$ BEGIN
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "markets" ("id", "code", "name", "nameEn", "nameAr", "country", "currency", "timezone", "workingDays", "tradingHours", "regulator", "isActive") VALUES
('market-egx', 'EGX', 'البورصة المصرية', 'Egyptian Exchange', 'البورصة المصرية', 'EG', 'EGP', 'Africa/Cairo', ARRAY['SUN','MON','TUE','WED','THU'], '{"open":"10:00","close":"14:30"}', 'FRA', true),
('market-tasi', 'TASI', 'السوق المالية السعودية', 'Saudi Exchange', 'السوق المالية السعودية', 'SA', 'SAR', 'Asia/Riyadh', ARRAY['SUN','MON','TUE','WED','THU'], '{"open":"10:00","close":"15:00"}', 'CMA', true),
('market-dfm', 'DFM', 'سوق دبي المالي', 'Dubai Financial Market', 'سوق دبي المالي', 'AE', 'AED', 'Asia/Dubai', ARRAY['MON','TUE','WED','THU','FRI'], '{"open":"10:00","close":"14:45"}', 'SCA', false),
('market-adx', 'ADX', 'سوق أبوظبي للأوراق المالية', 'Abu Dhabi Securities Exchange', 'سوق أبوظبي', 'AE', 'AED', 'Asia/Dubai', ARRAY['MON','TUE','WED','THU','FRI'], '{"open":"10:00","close":"15:00"}', 'SCA', false),
('market-qse', 'QSE', 'بورصة قطر', 'Qatar Stock Exchange', 'بورصة قطر', 'QA', 'QAR', 'Asia/Qatar', ARRAY['SUN','MON','TUE','WED','THU'], '{"open":"09:30","close":"13:15"}', 'QFMA', false)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "currencies" ("id", "code", "name", "symbol", "decimals", "isActive") VALUES
('currency-egp','EGP','الجنيه المصري','ج.م',2,true),
('currency-sar','SAR','الريال السعودي','ر.س',2,true),
('currency-aed','AED','الدرهم الإماراتي','د.إ',2,true),
('currency-qar','QAR','الريال القطري','ر.ق',2,true),
('currency-usd','USD','الدولار الأمريكي','$',2,true),
('currency-eur','EUR','اليورو','€',2,true)
ON CONFLICT ("code") DO NOTHING; 

INSERT INTO "localizations" ("id", "language", "country", "dialect", "key", "value") VALUES
('loc-ar-eg','ar-EG','EG','EGYPTIAN','greeting','إزيك؟'),
('loc-ar-sa','ar-SA','SA','GULF','greeting','كيف حالك؟'),
('loc-ar-ae','ar-AE','AE','GULF','greeting','شحالك؟')
ON CONFLICT ("language","key") DO NOTHING; 

UPDATE "users" SET "country" = COALESCE("country", 'EG'), "language" = CASE WHEN "language" = 'ar' THEN 'ar-EG' ELSE "language" END;
