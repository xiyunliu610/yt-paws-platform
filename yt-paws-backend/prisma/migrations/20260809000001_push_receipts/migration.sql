CREATE TABLE "PushTicket" (
  "id" UUID NOT NULL,
  "deviceId" UUID NOT NULL,
  "expoTicketId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushTicket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushTicket_expoTicketId_key" ON "PushTicket"("expoTicketId");
CREATE INDEX "PushTicket_status_nextCheckAt_idx" ON "PushTicket"("status", "nextCheckAt");
ALTER TABLE "PushTicket" ADD CONSTRAINT "PushTicket_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "PushDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
