-- AlterEnum
ALTER TYPE "PermissionType" ADD VALUE 'NONE';

-- AlterTable
ALTER TABLE "SharedLayout" ALTER COLUMN "token" DROP NOT NULL;
