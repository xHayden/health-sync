/*
  Warnings:

  - The primary key for the `Layout` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Layout` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('READ', 'WRITE');

-- AlterTable
ALTER TABLE "Layout" DROP CONSTRAINT "Layout_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Layout_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "workoutType" TEXT;

-- CreateTable
CREATE TABLE "SharedLayout" (
    "id" SERIAL NOT NULL,
    "layoutId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "sharedUserId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3),

    CONSTRAINT "SharedLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedLayoutDataScope" (
    "id" SERIAL NOT NULL,
    "sharedLayoutId" INTEGER NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" INTEGER,
    "permissions" "PermissionType"[],

    CONSTRAINT "SharedLayoutDataScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedLayout_token_key" ON "SharedLayout"("token");

-- CreateIndex
CREATE INDEX "SharedLayoutDataScope_sharedLayoutId_resourceType_resourceI_idx" ON "SharedLayoutDataScope"("sharedLayoutId", "resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "SharedLayout" ADD CONSTRAINT "SharedLayout_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedLayout" ADD CONSTRAINT "SharedLayout_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedLayout" ADD CONSTRAINT "SharedLayout_sharedUserId_fkey" FOREIGN KEY ("sharedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedLayoutDataScope" ADD CONSTRAINT "SharedLayoutDataScope_sharedLayoutId_fkey" FOREIGN KEY ("sharedLayoutId") REFERENCES "SharedLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
