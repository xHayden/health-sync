/*
  Warnings:

  - You are about to drop the column `totalWorkoutTime` on the `Workout` table. All the data in the column will be lost.
  - Added the required column `duration` to the `Workout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Workout" DROP COLUMN "totalWorkoutTime",
ADD COLUMN     "duration" INTEGER NOT NULL;
