/*
  Warnings:

  - You are about to drop the column `layout` on the `Layout` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Layout" DROP COLUMN "layout",
ADD COLUMN     "widgets" JSONB[];
