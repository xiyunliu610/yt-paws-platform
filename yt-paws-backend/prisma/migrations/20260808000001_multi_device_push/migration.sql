CREATE TABLE "PushDevice" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "token" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushDevice_token_key" ON "PushDevice"("token");
CREATE INDEX "PushDevice_userId_idx" ON "PushDevice"("userId");
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve an already-registered device when upgrading an existing V1 DB.
INSERT INTO "PushDevice" ("id", "userId", "token", "updatedAt")
SELECT gen_random_uuid(), "id", "pushToken", CURRENT_TIMESTAMP
FROM "User"
WHERE "pushToken" IS NOT NULL;

ALTER TABLE "User" DROP COLUMN "pushToken";
