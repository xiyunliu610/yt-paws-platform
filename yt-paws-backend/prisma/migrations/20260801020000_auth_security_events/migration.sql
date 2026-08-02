ALTER TABLE "User"
  ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3);

CREATE TABLE "SecurityEvent" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "type" TEXT NOT NULL,
  "ipAddress" TEXT,
  "emailHash" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityEvent_type_ipAddress_createdAt_idx"
  ON "SecurityEvent"("type", "ipAddress", "createdAt");
CREATE INDEX "SecurityEvent_type_emailHash_createdAt_idx"
  ON "SecurityEvent"("type", "emailHash", "createdAt");
CREATE INDEX "SecurityEvent_userId_createdAt_idx"
  ON "SecurityEvent"("userId", "createdAt");
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
