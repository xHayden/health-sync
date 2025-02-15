/*
  Warnings:

  - You are about to drop the column `hrv` on the `DailySleepSummary` table. All the data in the column will be lost.
  - You are about to drop the column `hrvCoV` on the `DailySleepSummary` table. All the data in the column will be lost.
  - You are about to drop the column `oxygen_saturation` on the `DailySleepSummary` table. All the data in the column will be lost.
  - You are about to drop the column `recovery` on the `DailySleepSummary` table. All the data in the column will be lost.
  - You are about to drop the column `rhr` on the `DailySleepSummary` table. All the data in the column will be lost.
  - You are about to drop the column `vo2_max` on the `DailySleepSummary` table. All the data in the column will be lost.
  - You are about to drop the column `atl` on the `DailyWorkoutSummary` table. All the data in the column will be lost.
  - You are about to drop the column `bodyWeight` on the `DailyWorkoutSummary` table. All the data in the column will be lost.
  - You are about to drop the column `ctl` on the `DailyWorkoutSummary` table. All the data in the column will be lost.
  - You are about to drop the column `exerciseTypes` on the `DailyWorkoutSummary` table. All the data in the column will be lost.
  - You are about to drop the column `hrv` on the `DailyWorkoutSummary` table. All the data in the column will be lost.
  - You are about to drop the column `hrvCoV` on the `DailyWorkoutSummary` table. All the data in the column will be lost.
  - You are about to drop the column `rhr` on the `DailyWorkoutSummary` table. All the data in the column will be lost.
  - You are about to drop the column `stress` on the `DailyWorkoutSummary` table. All the data in the column will be lost.
  - You are about to drop the column `tts` on the `DailyWorkoutSummary` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailySleepSummary" DROP COLUMN "hrv",
DROP COLUMN "hrvCoV",
DROP COLUMN "oxygen_saturation",
DROP COLUMN "recovery",
DROP COLUMN "rhr",
DROP COLUMN "vo2_max";

-- AlterTable
ALTER TABLE "DailyWorkoutSummary" DROP COLUMN "atl",
DROP COLUMN "bodyWeight",
DROP COLUMN "ctl",
DROP COLUMN "exerciseTypes",
DROP COLUMN "hrv",
DROP COLUMN "hrvCoV",
DROP COLUMN "rhr",
DROP COLUMN "stress",
DROP COLUMN "tts",
ADD COLUMN     "bodyweight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "HealthDataPoint" ADD COLUMN     "dailySleepSummaryId" INTEGER,
ADD COLUMN     "dailyWorkoutSummaryId" INTEGER;

-- AddForeignKey
ALTER TABLE "HealthDataPoint" ADD CONSTRAINT "HealthDataPoint_dailyWorkoutSummaryId_fkey" FOREIGN KEY ("dailyWorkoutSummaryId") REFERENCES "DailyWorkoutSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthDataPoint" ADD CONSTRAINT "HealthDataPoint_dailySleepSummaryId_fkey" FOREIGN KEY ("dailySleepSummaryId") REFERENCES "DailySleepSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
