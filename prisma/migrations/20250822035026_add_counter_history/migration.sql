-- CreateTable
CREATE TABLE "CounterHistory" (
    "id" SERIAL NOT NULL,
    "counterId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounterHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CounterHistory_counterId_timestamp_idx" ON "CounterHistory"("counterId", "timestamp");

-- CreateIndex
CREATE INDEX "CounterHistory_userId_timestamp_idx" ON "CounterHistory"("userId", "timestamp");

-- AddForeignKey
ALTER TABLE "CounterHistory" ADD CONSTRAINT "CounterHistory_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "Counter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterHistory" ADD CONSTRAINT "CounterHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
