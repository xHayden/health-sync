/*
  Warnings:

  - You are about to drop the column `duration` on the `Workout` table. All the data in the column will be lost.
  - You are about to drop the `FitnessMetric` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `totalWorkoutTime` to the `Workout` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FitnessMetric" DROP CONSTRAINT "FitnessMetric_userId_fkey";

-- AlterTable
ALTER TABLE "Workout" DROP COLUMN "duration",
ADD COLUMN     "dailyWorkoutSummaryId" INTEGER,
ADD COLUMN     "totalWorkoutTime" INTEGER NOT NULL;

-- DropTable
DROP TABLE "FitnessMetric";

-- CreateTable
CREATE TABLE "SleepSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "categoryValue" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "dailySleepSummaryId" INTEGER,

    CONSTRAINT "SleepSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyWorkoutSummary" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalWorkoutTime" INTEGER NOT NULL,
    "energyBurned" DOUBLE PRECISION,
    "totalDistance" DOUBLE PRECISION,
    "steps" DOUBLE PRECISION,
    "exerciseTypes" TEXT[],
    "tts" DOUBLE PRECISION,
    "atl" DOUBLE PRECISION,
    "ctl" DOUBLE PRECISION,
    "hrv" DOUBLE PRECISION[],
    "hrvCoV" DOUBLE PRECISION[],
    "rhr" DOUBLE PRECISION[],
    "bodyWeight" DOUBLE PRECISION,
    "stress" DOUBLE PRECISION[],

    CONSTRAINT "DailyWorkoutSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySleepSummary" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalSleepSeconds" INTEGER NOT NULL,
    "hrv" DOUBLE PRECISION[],
    "hrvCoV" DOUBLE PRECISION[],
    "rhr" DOUBLE PRECISION[],
    "recovery" INTEGER,
    "oxygen_saturation" DOUBLE PRECISION[],
    "vo2_max" DOUBLE PRECISION[],

    CONSTRAINT "DailySleepSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SleepSession_userId_startDate_endDate_key" ON "SleepSession"("userId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyWorkoutSummary_userId_date_key" ON "DailyWorkoutSummary"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailySleepSummary_userId_date_key" ON "DailySleepSummary"("userId", "date");

-- AddForeignKey
ALTER TABLE "SleepSession" ADD CONSTRAINT "SleepSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepSession" ADD CONSTRAINT "SleepSession_dailySleepSummaryId_fkey" FOREIGN KEY ("dailySleepSummaryId") REFERENCES "DailySleepSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_dailyWorkoutSummaryId_fkey" FOREIGN KEY ("dailyWorkoutSummaryId") REFERENCES "DailyWorkoutSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyWorkoutSummary" ADD CONSTRAINT "DailyWorkoutSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySleepSummary" ADD CONSTRAINT "DailySleepSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
