-- Index the resource/time overlap queries used by booking and staff capacity
-- checks. The status column excludes completed/cancelled history before the
-- date-range predicate is evaluated.
CREATE INDEX "Booking_petId_status_startDate_endDate_idx"
ON "Booking"("petId", "status", "startDate", "endDate");

CREATE INDEX "Booking_businessId_status_startDate_endDate_idx"
ON "Booking"("businessId", "status", "startDate", "endDate");

CREATE INDEX "Booking_serviceId_status_startDate_endDate_idx"
ON "Booking"("serviceId", "status", "startDate", "endDate");

CREATE INDEX "Booking_assignedStaffId_status_startDate_endDate_idx"
ON "Booking"("assignedStaffId", "status", "startDate", "endDate");

CREATE INDEX "Booking_customerId_createdAt_idx"
ON "Booking"("customerId", "createdAt");
