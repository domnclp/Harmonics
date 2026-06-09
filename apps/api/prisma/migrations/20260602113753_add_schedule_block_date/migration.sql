-- AlterTable
ALTER TABLE "ScheduleBlock" ADD COLUMN     "date" DATE;

-- CreateIndex
CREATE INDEX "ScheduleBlock_userId_date_idx" ON "ScheduleBlock"("userId", "date");
