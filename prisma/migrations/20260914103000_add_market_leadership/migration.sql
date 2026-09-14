CREATE TABLE IF NOT EXISTS "courses" (
  "id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "titleEn" TEXT, "description" TEXT NOT NULL,
  "level" TEXT NOT NULL, "category" TEXT NOT NULL, "duration" INTEGER NOT NULL, "thumbnail" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0, "isFree" BOOLEAN NOT NULL DEFAULT true, "instructorId" TEXT,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0, "totalStudents" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courses_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "courses_level_category_idx" ON "courses"("level", "category");
CREATE TABLE IF NOT EXISTS "lessons" (
  "id" TEXT NOT NULL PRIMARY KEY, "courseId" TEXT NOT NULL, "title" TEXT NOT NULL, "content" TEXT NOT NULL,
  "videoUrl" TEXT, "duration" INTEGER NOT NULL, "order" INTEGER NOT NULL, "quiz" JSONB, "resources" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "lessons_courseId_order_idx" ON "lessons"("courseId", "order");
CREATE TABLE IF NOT EXISTS "course_enrollments" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "courseId" TEXT NOT NULL, "progress" INTEGER NOT NULL DEFAULT 0,
  "completedLessons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "score" INTEGER, "certificateId" TEXT UNIQUE,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "course_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "course_enrollments_userId_courseId_key" ON "course_enrollments"("userId", "courseId");
CREATE TABLE IF NOT EXISTS "certificates" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "courseId" TEXT NOT NULL, "certificateUrl" TEXT NOT NULL,
  "verificationCode" TEXT NOT NULL UNIQUE, "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "forum_categories" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "nameEn" TEXT, "icon" TEXT, "order" INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS "forum_topics" (
  "id" TEXT NOT NULL PRIMARY KEY, "categoryId" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "content" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "views" INTEGER NOT NULL DEFAULT 0, "replyCount" INTEGER NOT NULL DEFAULT 0,
  "isPinned" BOOLEAN NOT NULL DEFAULT false, "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "lastReplyAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_topics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "forum_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "forum_topics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "forum_topics_categoryId_createdAt_idx" ON "forum_topics"("categoryId", "createdAt");
CREATE TABLE IF NOT EXISTS "forum_replies" (
  "id" TEXT NOT NULL PRIMARY KEY, "topicId" TEXT NOT NULL, "userId" TEXT NOT NULL, "content" TEXT NOT NULL,
  "likes" INTEGER NOT NULL DEFAULT 0, "isAnswer" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_replies_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "forum_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "forum_replies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "forum_replies_topicId_createdAt_idx" ON "forum_replies"("topicId", "createdAt");
CREATE TABLE IF NOT EXISTS "user_reputations" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE, "points" INTEGER NOT NULL DEFAULT 0,
  "level" TEXT NOT NULL DEFAULT 'NEWBIE', "badges" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "helpfulAnswers" INTEGER NOT NULL DEFAULT 0, "acceptedAnswers" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_reputations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "videos" (
  "id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT, "url" TEXT NOT NULL, "thumbnail" TEXT,
  "duration" INTEGER NOT NULL DEFAULT 0, "category" TEXT NOT NULL, "symbol" TEXT, "authorId" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0, "likes" INTEGER NOT NULL DEFAULT 0, "isPremium" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "videos_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "videos_category_publishedAt_idx" ON "videos"("category", "publishedAt");
CREATE TABLE IF NOT EXISTS "webinars" (
  "id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "hostId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL, "duration" INTEGER NOT NULL DEFAULT 60, "maxAttendees" INTEGER, "attendees" INTEGER NOT NULL DEFAULT 0,
  "meetingUrl" TEXT, "recordingUrl" TEXT, "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  CONSTRAINT "webinars_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "webinars_scheduledAt_idx" ON "webinars"("scheduledAt");
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "nameEn" TEXT, "type" TEXT NOT NULL, "tier" TEXT NOT NULL DEFAULT 'BASIC',
  "maxUsers" INTEGER NOT NULL DEFAULT 10, "logoUrl" TEXT, "website" TEXT, "contactEmail" TEXT NOT NULL, "contactPhone" TEXT,
  "isVerified" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'MEMBER', "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_members_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_members_user_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");
CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT NOT NULL PRIMARY KEY, "referrerId" TEXT NOT NULL, "referredId" TEXT NOT NULL, "code" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "rewardAmount" DOUBLE PRECISION, "rewardType" TEXT, "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_referrer_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "referrals_referred_fkey" FOREIGN KEY ("referredId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "referrals_referrerId_idx" ON "referrals"("referrerId");
CREATE TABLE IF NOT EXISTS "referral_codes" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE, "code" TEXT NOT NULL UNIQUE, "uses" INTEGER NOT NULL DEFAULT 0, "maxUses" INTEGER,
  "totalReward" DOUBLE PRECISION NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" TEXT NOT NULL PRIMARY KEY, "slug" TEXT NOT NULL UNIQUE, "title" TEXT NOT NULL, "titleEn" TEXT, "excerpt" TEXT, "content" TEXT NOT NULL,
  "coverImage" TEXT, "authorId" TEXT, "category" TEXT NOT NULL, "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "seoTitle" TEXT, "seoDescription" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false, "publishedAt" TIMESTAMP(3), "views" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "blog_posts_isPublished_publishedAt_idx" ON "blog_posts"("isPublished", "publishedAt");
