-- CreateTable
CREATE TABLE "Layout" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Layout_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Layout" ADD CONSTRAINT "Layout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
